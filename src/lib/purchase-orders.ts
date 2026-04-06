import { z } from "zod"

import {
  formatCentsToBRL,
  formatCurrencyInputFromCents,
  maskCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const PURCHASE_ORDERS_PAGE_SIZE = 10

export type SearchParamsLike = Record<string, string | string[] | undefined>

export const purchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
])

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>

export type PurchaseOrderItemSummary = {
  id: string
  productId: string | null
  productName: string | null
  internalCode: string | null
  description: string
  quantity: number
  unitCostCents: number
  totalCostCents: number
  receivedQuantity: number
  remainingQuantity: number
}

export type PurchaseOrderSummary = {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string | null
  status: PurchaseOrderStatus
  totalCents: number
  orderedAt: string | null
  createdAt: string
  pendingItems: number
}

export type PurchaseOrderDetail = {
  id: string
  supplierId: string
  supplierName: string | null
  orderNumber: string
  status: PurchaseOrderStatus
  notes: string | null
  subtotalCents: number
  totalCents: number
  orderedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  items: PurchaseOrderItemSummary[]
}

export type PurchaseOrderListFilters = {
  search: string
  status: PurchaseOrderStatus | null
  page: number
}

export type PurchaseOrderFormProductOption = {
  id: string
  label: string
  hasSerialControl: boolean
}

export type PurchaseOrderFormSupplierOption = {
  id: string
  name: string
}

export const purchaseOrderItemFormSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  description: z.string(),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade.")
    .refine((value) => parsePurchaseOrderQuantity(value) > 0, {
      message: "Informe uma quantidade maior que zero.",
    }),
  unit_cost: z
    .string()
    .trim()
    .min(1, "Informe o custo unitário.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um custo válido.",
    }),
})

export type PurchaseOrderItemFormValues = z.infer<
  typeof purchaseOrderItemFormSchema
>

export const purchaseOrderFormSchema = z.object({
  supplier_id: z.string().uuid("Selecione um fornecedor."),
  notes: z.string(),
  items: z
    .array(purchaseOrderItemFormSchema)
    .min(1, "Adicione pelo menos um item ao pedido."),
})

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>

export const purchaseOrderMutationSchema = z.object({
  supplier_id: z.string().uuid("Selecione um fornecedor."),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("Selecione um produto."),
        description: z.string().trim().max(255).nullable().optional(),
        quantity: z.number().positive("Informe uma quantidade maior que zero."),
        unit_cost: z
          .number()
          .int("Informe um custo válido.")
          .min(0, "O custo não pode ser negativo."),
      })
    )
    .min(1, "Adicione pelo menos um item ao pedido."),
})

export type PurchaseOrderMutationInput = z.infer<
  typeof purchaseOrderMutationSchema
>

export const purchaseOrderReceiveFormItemSchema = z.object({
  purchase_order_item_id: z.string().uuid(),
  description: z.string(),
  remaining_quantity: z.number().min(0),
  received_quantity: z
    .string()
    .trim()
    .refine((value) => {
      if (!value.trim()) {
        return true
      }

      return parsePurchaseOrderQuantity(value) >= 0
    }, "Informe uma quantidade válida."),
})

export const purchaseOrderReceiveFormSchema = z.object({
  due_date: z.string().min(1, "Informe a data de vencimento."),
  notes: z.string(),
  items: z
    .array(purchaseOrderReceiveFormItemSchema)
    .refine(
      (items) =>
        items.some((item) => parsePurchaseOrderQuantity(item.received_quantity) > 0),
      "Informe pelo menos uma quantidade recebida."
    ),
})

export type PurchaseOrderReceiveFormValues = z.infer<
  typeof purchaseOrderReceiveFormSchema
>

export const purchaseOrderReceiveMutationSchema = z.object({
  due_date: z.string().date("Informe a data de vencimento."),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z
    .array(
      z.object({
        purchase_order_item_id: z.string().uuid(),
        received_quantity: z.number().positive(),
      })
    )
    .min(1),
})

export type PurchaseOrderReceiveMutationInput = z.infer<
  typeof purchaseOrderReceiveMutationSchema
>

export const defaultPurchaseOrderItemFormValues: PurchaseOrderItemFormValues = {
  product_id: "",
  description: "",
  quantity: "1",
  unit_cost: "0,00",
}

export const defaultPurchaseOrderFormValues: PurchaseOrderFormValues = {
  supplier_id: "",
  notes: "",
  items: [{ ...defaultPurchaseOrderItemFormValues }],
}

export function getPurchaseOrderListFilters(
  searchParams: SearchParamsLike
): PurchaseOrderListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const statusValue = (getValue("status") ?? "").trim()

  return {
    search: (getValue("search") ?? "").trim(),
    status: purchaseOrderStatusSchema.safeParse(statusValue).success
      ? (statusValue as PurchaseOrderStatus)
      : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toPurchaseOrderMutationInput(
  values: PurchaseOrderFormValues
): PurchaseOrderMutationInput {
  const parsed = purchaseOrderFormSchema.parse(values)

  return {
    supplier_id: parsed.supplier_id,
    notes: normalizeOptionalString(parsed.notes),
    items: parsed.items.map((item) => ({
      product_id: item.product_id,
      description: normalizeOptionalString(item.description),
      quantity: parsePurchaseOrderQuantity(item.quantity),
      unit_cost: parseCurrencyInputToCents(item.unit_cost),
    })),
  }
}

export function toPurchaseOrderReceiveFormValues(
  items: PurchaseOrderItemSummary[]
): PurchaseOrderReceiveFormValues {
  return {
    due_date: new Date().toISOString().slice(0, 10),
    notes: "",
    items: items.map((item) => ({
      purchase_order_item_id: item.id,
      description: item.description,
      remaining_quantity: item.remainingQuantity,
      received_quantity:
        item.remainingQuantity > 0 ? String(item.remainingQuantity) : "0",
    })),
  }
}

export function toPurchaseOrderReceiveMutationInput(
  values: PurchaseOrderReceiveFormValues
): PurchaseOrderReceiveMutationInput {
  const parsed = purchaseOrderReceiveFormSchema.parse(values)

  return {
    due_date: parsed.due_date,
    notes: normalizeOptionalString(parsed.notes),
    items: parsed.items
      .map((item) => ({
        purchase_order_item_id: item.purchase_order_item_id,
        received_quantity: parsePurchaseOrderQuantity(item.received_quantity),
      }))
      .filter((item) => item.received_quantity > 0),
  }
}

export function toPurchaseOrderFormValues(
  detail: Pick<PurchaseOrderDetail, "supplierId" | "notes" | "items">
): PurchaseOrderFormValues {
  return {
    supplier_id: detail.supplierId,
    notes: detail.notes ?? "",
    items: detail.items.map((item) => ({
      product_id: item.productId ?? "",
      description: item.description,
      quantity: formatPurchaseOrderQuantityInput(item.quantity),
      unit_cost: formatCurrencyInputFromCents(item.unitCostCents),
    })),
  }
}

export function getPurchaseOrderStatusLabel(status: PurchaseOrderStatus) {
  const labels: Record<PurchaseOrderStatus, string> = {
    DRAFT: "Rascunho",
    ORDERED: "Emitido",
    PARTIALLY_RECEIVED: "Recebido parcial",
    RECEIVED: "Recebido",
    CANCELLED: "Cancelado",
  }

  return labels[status]
}

export function getPurchaseOrderStatusClasses(status: PurchaseOrderStatus) {
  const classes: Record<PurchaseOrderStatus, string> = {
    DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
    ORDERED: "border-sky-200 bg-sky-50 text-sky-700",
    PARTIALLY_RECEIVED: "border-amber-200 bg-amber-50 text-amber-700",
    RECEIVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-700",
  }

  return classes[status]
}

export function getPurchaseOrderStatusOptions() {
  return purchaseOrderStatusSchema.options.map((status) => ({
    value: status,
    label: getPurchaseOrderStatusLabel(status),
  }))
}

export function parsePurchaseOrderQuantity(value: string) {
  const normalized = value.replace(",", ".").trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatPurchaseOrderQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function formatPurchaseOrderQuantityInput(value: number) {
  return String(value).replace(".", ",")
}

export function formatPurchaseOrderCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export function formatPurchaseOrderMoney(cents: number) {
  return formatCentsToBRL(cents)
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
