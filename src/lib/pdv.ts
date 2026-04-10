import { z } from "zod"

import {
  formatCentsToBRL,
  formatDateTime,
  formatQuantity,
} from "@/lib/products"

export const PDV_CART_STORAGE_KEY = "alpha-tecnologia:pdv-cart"
export const PDV_SEARCH_RESULT_LIMIT = 8

export const pdvPaymentMethodSchema = z.enum([
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
])

export type PdvPaymentMethod = z.infer<typeof pdvPaymentMethodSchema>

export type PdvCategorySummary = {
  id: string | null
  name: string
}

export type PdvSearchResult = {
  key: string
  kind: "product" | "unit"
  productId: string
  productUnitId: string | null
  internalCode: string
  name: string
  salePriceCents: number
  hasSerialControl: boolean
  availableQuantity: number
  imageUrl: string | null
  category: PdvCategorySummary | null
  imeiOrSerial: string | null
}

export type PdvCartItem = {
  key: string
  productId: string
  productUnitId: string | null
  internalCode: string
  name: string
  quantity: number
  unitPriceCents: number
  hasSerialControl: boolean
  imeiOrSerial: string | null
  availableQuantity: number
  imageUrl: string | null
  category: PdvCategorySummary | null
}

export type PdvDiscountInput =
  | {
      mode: "amount"
      valueCents: number
    }
  | {
      mode: "percent"
      value: string
    }

export type PdvPaymentLine = {
  id: string
  method: PdvPaymentMethod
  amountCents: number
}

export type PdvCustomerOption = {
  id: string
  name: string
  phone: string | null
}

export type PdvCheckoutItemInput = {
  product_id: string
  product_unit_id?: string | null
  quantity: number
  unit_price: number
  discount_amount?: number | null
}

export type PdvCheckoutPaymentInput = {
  method: PdvPaymentMethod
  amount: number
}

export type PdvCompletedSaleItem = {
  id: string
  productId: string
  productUnitId: string | null
  name: string
  internalCode: string
  imeiOrSerial: string | null
  quantity: number
  unitPriceCents: number
  discountAmountCents: number
  totalPriceCents: number
}

export type PdvCompletedSalePayment = {
  id: string
  method: PdvPaymentMethod
  amountCents: number
  installments: number
}

export type PdvCompletedSale = {
  id: string
  saleNumber: string
  customerName: string | null
  subtotalCents: number
  discountAmountCents: number
  totalCents: number
  changeCents: number
  completedAt: string | null
  items: PdvCompletedSaleItem[]
  payments: PdvCompletedSalePayment[]
}

export type PdvPaymentPreview = {
  id: string
  method: PdvPaymentMethod
  enteredAmountCents: number
  appliedAmountCents: number
}

export type PdvCartSummary = {
  subtotalCents: number
  discountAmountCents: number
  totalCents: number
  totalPaidCents: number
  nonCashPaidCents: number
  cashReceivedCents: number
  changeCents: number
  remainingCents: number
  isPaymentValid: boolean
  paymentError: string | null
  appliedPayments: PdvPaymentPreview[]
}

export const pdvCheckoutSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  discount_amount: z
    .number()
    .int("Desconto inválido.")
    .min(0, "Desconto inválido.")
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("Produto inválido."),
        product_unit_id: z.string().uuid().nullable().optional(),
        quantity: z.number().positive("Quantidade inválida."),
        unit_price: z
          .number()
          .int("Preço unitário inválido.")
          .min(0, "Preço unitário inválido."),
        discount_amount: z
          .number()
          .int("Desconto do item inválido.")
          .min(0, "Desconto do item inválido.")
          .nullable()
          .optional(),
      })
    )
    .min(1, "Adicione pelo menos um item."),
  payments: z.array(
    z.object({
      method: pdvPaymentMethodSchema,
      amount: z.number().int("Valor inválido.").positive("Valor inválido."),
    })
  ),
})

export type PdvCheckoutInput = z.infer<typeof pdvCheckoutSchema>

export const defaultPdvDiscount: PdvDiscountInput = {
  mode: "amount",
  valueCents: 0,
}

export function getPdvPaymentMethodLabel(method: PdvPaymentMethod) {
  const labels: Record<PdvPaymentMethod, string> = {
    CASH: "Dinheiro",
    PIX: "PIX",
    DEBIT_CARD: "Débito",
    CREDIT_CARD: "Crédito",
  }

  return labels[method]
}

export function getPdvPaymentMethods() {
  return [
    { method: "CASH" as const, label: "Dinheiro" },
    { method: "PIX" as const, label: "PIX" },
    { method: "DEBIT_CARD" as const, label: "Débito" },
    { method: "CREDIT_CARD" as const, label: "Crédito" },
  ]
}

export function createPdvPaymentLine(
  method: PdvPaymentMethod,
  suggestedAmountCents = 0
): PdvPaymentLine {
  return {
    id: `${method}-${Math.random().toString(36).slice(2, 10)}`,
    method,
    amountCents: Math.max(0, suggestedAmountCents),
  }
}

export function getCartItemSubtotalCents(item: PdvCartItem) {
  return Math.round(item.unitPriceCents * item.quantity)
}

export function resolveDiscountAmountCents(
  subtotalCents: number,
  discount: PdvDiscountInput
) {
  if (discount.mode === "amount") {
    return clampDiscount(discount.valueCents, subtotalCents)
  }

  const normalized = discount.value.replace(",", ".").trim()
  const parsed = Number(normalized)
  const percentage = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 0

  return clampDiscount(Math.round((subtotalCents * percentage) / 100), subtotalCents)
}

export function buildPdvCartSummary(
  cartItems: PdvCartItem[],
  paymentLines: PdvPaymentLine[],
  discount: PdvDiscountInput
): PdvCartSummary {
  const subtotalCents = cartItems.reduce(
    (total, item) => total + getCartItemSubtotalCents(item),
    0
  )
  const discountAmountCents = resolveDiscountAmountCents(subtotalCents, discount)
  const totalCents = Math.max(0, subtotalCents - discountAmountCents)
  const totalPaidCents = paymentLines.reduce(
    (total, payment) => total + payment.amountCents,
    0
  )
  const nonCashPaidCents = paymentLines
    .filter((payment) => payment.method !== "CASH")
    .reduce((total, payment) => total + payment.amountCents, 0)
  const cashReceivedCents = paymentLines
    .filter((payment) => payment.method === "CASH")
    .reduce((total, payment) => total + payment.amountCents, 0)

  let remainingCents = totalCents
  const appliedPayments = paymentLines.map((payment) => {
    const appliedAmountCents =
      payment.method === "CASH"
        ? Math.min(payment.amountCents, Math.max(remainingCents, 0))
        : payment.amountCents

    remainingCents = Math.max(remainingCents - appliedAmountCents, 0)

    return {
      id: payment.id,
      method: payment.method,
      enteredAmountCents: payment.amountCents,
      appliedAmountCents,
    }
  })

  const hasCart = cartItems.length > 0
  const nonCashOverflow = nonCashPaidCents > totalCents
  const paymentsCovered = totalCents === 0 ? true : totalPaidCents >= totalCents
  const changeCents = cashReceivedCents > 0 ? Math.max(0, totalPaidCents - totalCents) : 0
  const paymentError = !hasCart
    ? "Adicione pelo menos um item."
    : nonCashOverflow
      ? "Pagamentos sem troco não podem exceder o total."
      : !paymentsCovered
        ? "Pagamentos insuficientes para finalizar a venda."
        : null

  return {
    subtotalCents,
    discountAmountCents,
    totalCents,
    totalPaidCents,
    nonCashPaidCents,
    cashReceivedCents,
    changeCents,
    remainingCents: Math.max(totalCents - totalPaidCents, 0),
    isPaymentValid: hasCart && paymentError === null,
    paymentError,
    appliedPayments,
  }
}

export function getSuggestedPaymentAmountCents(summary: PdvCartSummary) {
  return Math.max(summary.totalCents - summary.totalPaidCents, 0)
}

export function toPdvCheckoutPayload(
  cartItems: PdvCartItem[],
  paymentLines: PdvPaymentLine[],
  discount: PdvDiscountInput,
  customerId?: string | null,
  notes?: string | null
): PdvCheckoutInput {
  const payload = {
    customer_id: normalizeOptionalUuid(customerId),
    discount_amount: resolveDiscountAmountCents(
      cartItems.reduce((total, item) => total + getCartItemSubtotalCents(item), 0),
      discount
    ),
    notes: normalizeOptionalString(notes),
    items: cartItems.map((item) => ({
      product_id: item.productId,
      product_unit_id: item.productUnitId ?? null,
      quantity: item.quantity,
      unit_price: item.unitPriceCents,
      discount_amount: 0,
    })),
    payments: paymentLines
      .map((payment) => ({
        method: payment.method,
        amount: payment.amountCents,
      }))
      .filter((payment) => payment.amount > 0),
  }

  return pdvCheckoutSchema.parse(payload)
}

export function formatPdvReceiptItemQuantity(quantity: number) {
  return formatQuantity(quantity)
}

export { formatCentsToBRL, formatDateTime }

function clampDiscount(discountAmountCents: number, subtotalCents: number) {
  return Math.min(Math.max(discountAmountCents, 0), Math.max(subtotalCents, 0))
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalUuid(value: string | null | undefined) {
  return normalizeOptionalString(value)
}
