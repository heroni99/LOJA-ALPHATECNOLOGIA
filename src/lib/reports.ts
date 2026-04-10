import { z } from "zod"

import { formatQuantity, parseBooleanFilter } from "@/lib/products"
import { getSaleStatusLabel, saleStatusSchema, type SaleStatus } from "@/lib/sales"

export type SearchParamsLike = Record<string, string | string[] | undefined>

export type SalesReportFilters = {
  start: string
  end: string
  status: SaleStatus | null
  search: string
}

export type StockReportFilters = {
  search: string
  categoryId: string | null
  locationId: string | null
  lowStock: boolean
}

export type SalesReportRow = {
  id: string
  saleNumber: string
  customerName: string | null
  operatorName: string | null
  totalCents: number
  status: SaleStatus
  completedAt: string | null
  createdAt: string
  paymentMethods: string[]
}

export type StockReportLocationBalance = {
  locationId: string
  locationName: string | null
  quantity: number
}

export type StockReportRow = {
  id: string
  internalCode: string
  name: string
  categoryName: string | null
  totalQuantity: number
  stockMin: number
  costPriceCents: number
  salePriceCents: number
  isBelowMin: boolean
  locationBalances: StockReportLocationBalance[]
}

export type SalesReportResult = {
  items: SalesReportRow[]
  totalCents: number
  count: number
  averageTicketCents: number
  filters: SalesReportFilters
}

export type StockReportResult = {
  items: StockReportRow[]
  filters: StockReportFilters
}

const dateFilterSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")

const salesReportApiFiltersSchema = z
  .object({
    start: dateFilterSchema,
    end: dateFilterSchema,
    status: saleStatusSchema.nullable(),
    search: z.string(),
  })
  .refine((value) => value.end >= value.start, {
    message: "O período informado é inválido.",
    path: ["end"],
  })

function getValue(
  searchParams: SearchParamsLike,
  key: string
) {
  const rawValue = searchParams[key]

  return Array.isArray(rawValue) ? rawValue[0] : rawValue
}

export function getSalesReportFilters(
  searchParams: SearchParamsLike,
  defaults: Pick<SalesReportFilters, "start" | "end">
): SalesReportFilters {
  const start = (getValue(searchParams, "start") ?? "").trim() || defaults.start
  const end = (getValue(searchParams, "end") ?? "").trim() || defaults.end
  const statusValue = (getValue(searchParams, "status") ?? "").trim()

  return {
    start,
    end,
    status: saleStatusSchema.safeParse(statusValue).success
      ? (statusValue as SaleStatus)
      : null,
    search: (getValue(searchParams, "search") ?? "").trim(),
  }
}

export function parseSalesReportApiFilters(
  searchParams: SearchParamsLike
): SalesReportFilters {
  const statusValue = (getValue(searchParams, "status") ?? "").trim()

  return salesReportApiFiltersSchema.parse({
    start: (getValue(searchParams, "start") ?? "").trim(),
    end: (getValue(searchParams, "end") ?? "").trim(),
    status: saleStatusSchema.safeParse(statusValue).success
      ? (statusValue as SaleStatus)
      : null,
    search: (getValue(searchParams, "search") ?? "").trim(),
  })
}

export function getStockReportFilters(
  searchParams: SearchParamsLike
): StockReportFilters {
  return {
    search: (getValue(searchParams, "search") ?? "").trim(),
    categoryId: (getValue(searchParams, "category_id") ?? "").trim() || null,
    locationId: (getValue(searchParams, "location_id") ?? "").trim() || null,
    lowStock: parseBooleanFilter(getValue(searchParams, "low_stock")) === true,
  }
}

export function formatReportMoney(cents: number) {
  return ((Math.max(cents, 0) || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function escapeCsvCell(value: string) {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => escapeCsvCell(cell == null ? "" : String(cell)))
        .join(";")
    )
    .join("\r\n")

  return `\uFEFF${content}`
}

export function formatPaymentMethodsForDisplay(paymentMethods: string[]) {
  if (paymentMethods.length === 0) {
    return "Não informado"
  }

  return paymentMethods.join(" + ")
}

export function formatPaymentMethodsForCsv(paymentMethods: string[]) {
  return formatPaymentMethodsForDisplay(paymentMethods)
}

export function formatSaleStatusForCsv(status: SaleStatus) {
  return getSaleStatusLabel(status)
}

export function formatStockBalancesForDisplay(
  balances: StockReportLocationBalance[]
) {
  if (balances.length === 0) {
    return "Sem saldo por local"
  }

  return balances
    .map((balance) => `${balance.locationName ?? "Sem local"}: ${formatQuantity(balance.quantity)}`)
    .join(" • ")
}
