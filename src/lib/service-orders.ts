import { z } from "zod"

import {
  formatCentsToBRL,
  formatCurrencyInputFromCents,
  maskCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const SERVICE_ORDERS_PAGE_SIZE = 10

export type SearchParamsLike = Record<string, string | string[] | undefined>

export const serviceOrderStatusSchema = z.enum([
  "OPEN",
  "WAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
])

export type ServiceOrderStatus = z.infer<typeof serviceOrderStatusSchema>

export const serviceOrderMainFlowStatuses: ServiceOrderStatus[] = [
  "OPEN",
  "WAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "DELIVERED",
]

export type ServiceOrderListFilters = {
  search: string
  customerId: string | null
  status: ServiceOrderStatus | null
  page: number
}

export type ServiceOrderSummary = {
  id: string
  orderNumber: string
  customerName: string | null
  deviceType: string
  brand: string | null
  model: string | null
  technicianName: string | null
  status: ServiceOrderStatus
  createdAt: string
}

export type ServiceOrderCustomer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  cpfCnpj: string | null
  city: string | null
  state: string | null
}

export type ServiceOrderItem = {
  id: string
  productId: string | null
  productName: string | null
  internalCode: string | null
  itemType: string
  description: string
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
  stockConsumed: boolean
  createdAt: string
}

export type ServiceOrderHistoryEntry = {
  id: string
  oldStatus: ServiceOrderStatus | null
  newStatus: ServiceOrderStatus
  notes: string | null
  changedByUserId: string | null
  changedByName: string | null
  createdAt: string
}

export type ServiceOrderAttachment = {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  createdByUserId: string | null
  createdByName: string | null
}

export type ServiceOrderDetail = {
  id: string
  storeId: string
  customerId: string
  createdByUserId: string
  createdByName: string | null
  assignedToUserId: string | null
  assignedToName: string | null
  orderNumber: string
  status: ServiceOrderStatus
  deviceType: string
  brand: string | null
  model: string | null
  imei: string | null
  serialNumber: string | null
  color: string | null
  accessories: string | null
  reportedIssue: string
  foundIssue: string | null
  technicalNotes: string | null
  estimatedCompletionDate: string | null
  totalEstimatedCents: number
  totalFinalCents: number
  approvedAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
  customer: ServiceOrderCustomer | null
  items: ServiceOrderItem[]
  history: ServiceOrderHistoryEntry[]
  attachments: ServiceOrderAttachment[]
}

export const serviceOrderFormSchema = z.object({
  customer_id: z.string().uuid("Selecione um cliente."),
  device_type: z
    .string()
    .trim()
    .min(1, "Informe o tipo do aparelho.")
    .max(120),
  brand: z.string(),
  model: z.string(),
  imei: z.string(),
  serial_number: z.string(),
  color: z.string(),
  accessories: z.string(),
  reported_issue: z
    .string()
    .trim()
    .min(1, "Descreva o problema relatado.")
    .max(4000),
})

export type ServiceOrderFormValues = z.infer<typeof serviceOrderFormSchema>

export type ServiceOrderCreateMutationInput = z.infer<
  typeof serviceOrderCreateSchema
>

export const serviceOrderCreateSchema = z.object({
  customer_id: z.string().uuid("Selecione um cliente."),
  assigned_to_user_id: z.string().uuid().nullable().optional(),
  device_type: z
    .string()
    .trim()
    .min(1, "Informe o tipo do aparelho.")
    .max(120),
  brand: z.string().trim().max(120).nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(),
  imei: z.string().trim().max(80).nullable().optional(),
  serial_number: z.string().trim().max(120).nullable().optional(),
  color: z.string().trim().max(80).nullable().optional(),
  accessories: z.string().trim().max(1000).nullable().optional(),
  reported_issue: z
    .string()
    .trim()
    .min(1, "Descreva o problema relatado.")
    .max(4000),
})

export const serviceOrderUpdateSchema = z
  .object({
    customer_id: z.string().uuid().optional(),
    assigned_to_user_id: z.string().uuid().nullable().optional(),
    device_type: z.string().trim().min(1).max(120).optional(),
    brand: z.string().trim().max(120).nullable().optional(),
    model: z.string().trim().max(120).nullable().optional(),
    imei: z.string().trim().max(80).nullable().optional(),
    serial_number: z.string().trim().max(120).nullable().optional(),
    color: z.string().trim().max(80).nullable().optional(),
    accessories: z.string().trim().max(1000).nullable().optional(),
    reported_issue: z.string().trim().min(1).max(4000).optional(),
    found_issue: z.string().trim().max(4000).nullable().optional(),
    technical_notes: z.string().trim().max(4000).nullable().optional(),
    estimated_completion_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data prevista inválida.")
      .nullable()
      .optional(),
    total_estimated: z
      .number()
      .int("Valor inválido.")
      .min(0, "O orçamento não pode ser negativo.")
      .optional(),
    total_final: z
      .number()
      .int("Valor inválido.")
      .min(0, "O total final não pode ser negativo.")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualização.",
  })

export type ServiceOrderUpdateMutationInput = z.infer<
  typeof serviceOrderUpdateSchema
>

export const serviceOrderStatusChangeSchema = z.object({
  new_status: serviceOrderStatusSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
})

export type ServiceOrderStatusChangeInput = z.infer<
  typeof serviceOrderStatusChangeSchema
>

export const serviceOrderDiagnosisFormSchema = z.object({
  found_issue: z
    .string()
    .trim()
    .min(1, "Descreva o diagnóstico encontrado.")
    .max(4000),
  technical_notes: z.string().optional(),
  estimated_completion_date: z.string().optional(),
  total_estimated: z
    .string()
    .trim()
    .min(1, "Informe o orçamento.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um orçamento válido.",
    }),
  status_notes: z.string().optional(),
})

export type ServiceOrderDiagnosisFormValues = z.infer<
  typeof serviceOrderDiagnosisFormSchema
>

export const serviceOrderItemMutationSchema = z.object({
  product_id: z.string().uuid("Selecione uma peça."),
  description: z.string().trim().max(255).nullable().optional(),
  quantity: z.number().positive("Informe uma quantidade maior que zero."),
  unit_price: z
    .number()
    .int("Valor inválido.")
    .min(0, "O valor unitário não pode ser negativo."),
})

export type ServiceOrderItemMutationInput = z.infer<
  typeof serviceOrderItemMutationSchema
>

export const serviceOrderItemFormSchema = z.object({
  product_id: z.string().uuid("Selecione uma peça."),
  description: z.string().optional(),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade.")
    .refine((value) => parseServiceOrderQuantity(value) > 0, {
      message: "Informe uma quantidade maior que zero.",
    }),
  unit_price: z
    .string()
    .trim()
    .min(1, "Informe o valor unitário.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um valor unitário válido.",
    }),
})

export type ServiceOrderItemFormValues = z.infer<
  typeof serviceOrderItemFormSchema
>

export const defaultServiceOrderFormValues: ServiceOrderFormValues = {
  customer_id: "",
  device_type: "",
  brand: "",
  model: "",
  imei: "",
  serial_number: "",
  color: "",
  accessories: "",
  reported_issue: "",
}

export const defaultServiceOrderDiagnosisFormValues: ServiceOrderDiagnosisFormValues =
  {
    found_issue: "",
    technical_notes: "",
    estimated_completion_date: "",
    total_estimated: "0,00",
    status_notes: "",
  }

export const defaultServiceOrderItemFormValues: ServiceOrderItemFormValues = {
  product_id: "",
  description: "",
  quantity: "1",
  unit_price: "0,00",
}

export function getServiceOrderListFilters(
  searchParams: SearchParamsLike
): ServiceOrderListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const statusValue = (getValue("status") ?? "").trim()

  return {
    search: (getValue("search") ?? "").trim(),
    customerId: (getValue("customer") ?? "").trim() || null,
    status: serviceOrderStatusSchema.safeParse(statusValue).success
      ? (statusValue as ServiceOrderStatus)
      : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function getServiceOrderStatusLabel(status: ServiceOrderStatus) {
  const labels: Record<ServiceOrderStatus, string> = {
    OPEN: "Aberta",
    WAITING_APPROVAL: "Aguardando aprovação",
    APPROVED: "Aprovada",
    IN_PROGRESS: "Em andamento",
    READY_FOR_DELIVERY: "Pronta para entrega",
    DELIVERED: "Entregue",
    REJECTED: "Rejeitada",
    CANCELLED: "Cancelada",
  }

  return labels[status]
}

export function getServiceOrderStatusClasses(status: ServiceOrderStatus) {
  const classes: Record<ServiceOrderStatus, string> = {
    OPEN: "border-slate-200 bg-slate-100 text-slate-700",
    WAITING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-sky-200 bg-sky-50 text-sky-700",
    IN_PROGRESS: "border-orange-200 bg-orange-50 text-orange-700",
    READY_FOR_DELIVERY: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DELIVERED: "border-emerald-300 bg-emerald-100 text-emerald-800",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-700",
  }

  return classes[status]
}

export function getServiceOrderStatusOptions() {
  return serviceOrderStatusSchema.options.map((status) => ({
    value: status,
    label: getServiceOrderStatusLabel(status),
  }))
}

export function buildServiceOrderDeviceLabel(serviceOrder: {
  deviceType: string
  brand: string | null
  model: string | null
}) {
  return [serviceOrder.deviceType, serviceOrder.brand, serviceOrder.model]
    .filter(Boolean)
    .join(" / ")
}

export function formatServiceOrderDate(value: string | null) {
  if (!value) {
    return "Não informado"
  }

  const normalizedValue =
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(normalizedValue))
}

export function formatServiceOrderCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export function parseServiceOrderQuantity(value: string) {
  const normalized = value.replace(",", ".").trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatServiceOrderQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function toServiceOrderCreateInput(
  values: ServiceOrderFormValues
): ServiceOrderCreateMutationInput {
  const parsed = serviceOrderFormSchema.parse(values)

  return {
    customer_id: parsed.customer_id,
    device_type: parsed.device_type.trim(),
    brand: normalizeOptionalString(parsed.brand),
    model: normalizeOptionalString(parsed.model),
    imei: normalizeOptionalString(parsed.imei),
    serial_number: normalizeOptionalString(parsed.serial_number),
    color: normalizeOptionalString(parsed.color),
    accessories: normalizeOptionalString(parsed.accessories),
    reported_issue: parsed.reported_issue.trim(),
  }
}

export function toServiceOrderDiagnosisUpdateInput(
  values: ServiceOrderDiagnosisFormValues
): ServiceOrderUpdateMutationInput {
  const parsed = serviceOrderDiagnosisFormSchema.parse(values)

  return {
    found_issue: normalizeOptionalString(parsed.found_issue),
    technical_notes: normalizeOptionalString(parsed.technical_notes),
    estimated_completion_date: normalizeOptionalDate(
      parsed.estimated_completion_date
    ),
    total_estimated: parseCurrencyInputToCents(parsed.total_estimated),
  }
}

export function toServiceOrderStatusChangeInput(
  newStatus: ServiceOrderStatus,
  notes?: string
): ServiceOrderStatusChangeInput {
  return serviceOrderStatusChangeSchema.parse({
    new_status: newStatus,
    notes: normalizeOptionalString(notes),
  })
}

export function toServiceOrderItemMutationInput(
  values: ServiceOrderItemFormValues
): ServiceOrderItemMutationInput {
  const parsed = serviceOrderItemFormSchema.parse(values)

  return {
    product_id: parsed.product_id,
    description: normalizeOptionalString(parsed.description),
    quantity: parseServiceOrderQuantity(parsed.quantity),
    unit_price: parseCurrencyInputToCents(parsed.unit_price),
  }
}

export function getServiceOrderActionLabel(status: ServiceOrderStatus) {
  const labels: Partial<Record<ServiceOrderStatus, string>> = {
    OPEN: "Registrar diagnóstico",
    APPROVED: "Iniciar serviço",
    IN_PROGRESS: "Pronto para entrega",
    READY_FOR_DELIVERY: "Registrar entrega",
  }

  return labels[status] ?? null
}

export function getServiceOrderStatusNoteLabel(status: ServiceOrderStatus) {
  if (status === "REJECTED") {
    return "OS encerrada sem aprovação."
  }

  if (status === "CANCELLED") {
    return "OS cancelada."
  }

  return null
}

export function formatServiceOrderMoney(cents: number) {
  return formatCentsToBRL(cents)
}

export function toServiceOrderDiagnosisFormValues(serviceOrder: Pick<
  ServiceOrderDetail,
  "foundIssue" | "technicalNotes" | "estimatedCompletionDate" | "totalEstimatedCents"
>): ServiceOrderDiagnosisFormValues {
  return {
    found_issue: serviceOrder.foundIssue ?? "",
    technical_notes: serviceOrder.technicalNotes ?? "",
    estimated_completion_date: serviceOrder.estimatedCompletionDate ?? "",
    total_estimated: formatCurrencyInputFromCents(serviceOrder.totalEstimatedCents),
    status_notes: "",
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalDate(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

export { formatCentsToBRL }
