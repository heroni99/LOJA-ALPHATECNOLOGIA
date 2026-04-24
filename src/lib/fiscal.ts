import { z } from "zod"

export type SearchParamsLike = Record<string, string | string[] | undefined>

const dateFilterSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")

export const fiscalStatusSchema = z.enum(["ISSUED", "CANCELLED"])
export const fiscalGenerateSchema = z.object({
  sale_id: z.string().uuid("Venda inválida."),
})
export const fiscalCancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo do cancelamento.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
})

export type FiscalStatus = z.infer<typeof fiscalStatusSchema>

export type FiscalDocumentSummary = {
  id: string
  saleId: string
  saleNumber: string
  receiptNumber: string
  customerName: string | null
  totalCents: number
  status: FiscalStatus
  issuedAt: string
  cancelledAt: string | null
  cancelReason: string | null
}

export type FiscalListFilters = {
  start: string
  end: string
  status: FiscalStatus | null
}

export type FiscalListStats = {
  totalIssuedCents: number
  issuedCount: number
  cancelledCount: number
}

function getValue(searchParams: SearchParamsLike, key: string) {
  const rawValue = searchParams[key]

  return Array.isArray(rawValue) ? rawValue[0] : rawValue
}

export function getFiscalListFilters(
  searchParams: SearchParamsLike,
  defaults: Pick<FiscalListFilters, "start" | "end">
): FiscalListFilters {
  const start = (getValue(searchParams, "start") ?? "").trim() || defaults.start
  const end = (getValue(searchParams, "end") ?? "").trim() || defaults.end
  const statusValue = (getValue(searchParams, "status") ?? "").trim()

  return {
    start,
    end,
    status: fiscalStatusSchema.safeParse(statusValue).success
      ? (statusValue as FiscalStatus)
      : null,
  }
}

export function parseFiscalListFilters(
  searchParams: SearchParamsLike
): FiscalListFilters {
  const statusValue = (getValue(searchParams, "status") ?? "").trim()

  return z
    .object({
      start: dateFilterSchema,
      end: dateFilterSchema,
      status: fiscalStatusSchema.nullable(),
    })
    .refine((value) => value.end >= value.start, {
      message: "O período informado é inválido.",
      path: ["end"],
    })
    .parse({
      start: (getValue(searchParams, "start") ?? "").trim(),
      end: (getValue(searchParams, "end") ?? "").trim(),
      status: fiscalStatusSchema.safeParse(statusValue).success
        ? (statusValue as FiscalStatus)
        : null,
    })
}

export function getFiscalStatusLabel(status: FiscalStatus) {
  const labels: Record<FiscalStatus, string> = {
    ISSUED: "Emitido",
    CANCELLED: "Cancelado",
  }

  return labels[status]
}

export function getFiscalStatusClasses(status: FiscalStatus) {
  const classes: Record<FiscalStatus, string> = {
    ISSUED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  }

  return classes[status]
}

export function getFiscalStatusOptions() {
  return fiscalStatusSchema.options.map((status) => ({
    value: status,
    label: getFiscalStatusLabel(status),
  }))
}
