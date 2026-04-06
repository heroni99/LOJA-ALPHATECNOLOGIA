import { z } from "zod"

export const SALES_PAGE_SIZE = 10
export const SALE_RETURNS_PAGE_SIZE = 10

export type SearchParamsLike = Record<string, string | string[] | undefined>

export const saleStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
])

export type SaleStatus = z.infer<typeof saleStatusSchema>

export type SaleSummary = {
  id: string
  saleNumber: string
  customerName: string | null
  operatorName: string | null
  totalCents: number
  status: SaleStatus
  completedAt: string | null
  createdAt: string
}

export type SaleDetailItem = {
  id: string
  productId: string
  productUnitId: string | null
  name: string
  internalCode: string
  imeiOrSerial: string | null
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
  returnedQuantity: number
  availableReturnQuantity: number
}

export type SaleDetailPayment = {
  id: string
  method: string
  amountCents: number
  installments: number
}

export type SaleReturnHistoryEntry = {
  id: string
  returnNumber: string
  refundType: string
  reason: string
  totalAmountCents: number
  createdAt: string
}

export type SaleDetail = {
  id: string
  saleNumber: string
  customerId: string | null
  customerName: string | null
  operatorName: string | null
  status: SaleStatus
  subtotalCents: number
  discountAmountCents: number
  totalCents: number
  completedAt: string | null
  createdAt: string
  items: SaleDetailItem[]
  payments: SaleDetailPayment[]
  returns: SaleReturnHistoryEntry[]
}

export type SaleListFilters = {
  search: string
  status: SaleStatus | null
  page: number
}

export function getSaleListFilters(
  searchParams: SearchParamsLike
): SaleListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const statusValue = (getValue("status") ?? "").trim()

  return {
    search: (getValue("search") ?? "").trim(),
    status: saleStatusSchema.safeParse(statusValue).success
      ? (statusValue as SaleStatus)
      : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function getSaleStatusLabel(status: SaleStatus) {
  const labels: Record<SaleStatus, string> = {
    PENDING: "Pendente",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    PARTIALLY_REFUNDED: "Devolução parcial",
    REFUNDED: "Devolvida",
  }

  return labels[status]
}

export function getSaleStatusClasses(status: SaleStatus) {
  const classes: Record<SaleStatus, string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-700",
    PARTIALLY_REFUNDED: "border-sky-200 bg-sky-50 text-sky-700",
    REFUNDED: "border-rose-200 bg-rose-50 text-rose-700",
  }

  return classes[status]
}

export function getSaleStatusOptions() {
  return saleStatusSchema.options.map((status) => ({
    value: status,
    label: getSaleStatusLabel(status),
  }))
}
