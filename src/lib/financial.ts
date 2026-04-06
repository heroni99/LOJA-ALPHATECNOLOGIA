import { z } from "zod"

import {
  formatCentsToBRL,
  maskCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const FINANCIAL_PAGE_SIZE = 10

export type SearchParamsLike = Record<string, string | string[] | undefined>

export const payableStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
])

export const receivableStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "OVERDUE",
  "CANCELLED",
])

export const paymentMethodSchema = z.enum([
  "CASH",
  "PIX",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TRANSFER",
  "BOLETO",
  "STORE_CREDIT",
  "OTHER",
])

export type PayableStatus = z.infer<typeof payableStatusSchema>
export type ReceivableStatus = z.infer<typeof receivableStatusSchema>
export type FinancialPaymentMethod = z.infer<typeof paymentMethodSchema>

export type FinancialDueItem = {
  id: string
  description: string
  counterpartyName: string | null
  amountCents: number
  dueDate: string
  kind: "payable" | "receivable"
}

export type FinancialSummary = {
  receivableTotalCents: number
  payableTotalCents: number
  overdueReceivableCents: number
  overduePayableCents: number
  upcomingReceivables: FinancialDueItem[]
  upcomingPayables: FinancialDueItem[]
}

export type AccountPayableSummary = {
  id: string
  supplierName: string | null
  description: string
  amountCents: number
  dueDate: string
  paidAt: string | null
  status: PayableStatus
  paymentMethod: string | null
  notes: string | null
  purchaseOrderId: string | null
  isOverdue: boolean
}

export type AccountReceivableSummary = {
  id: string
  customerName: string | null
  description: string
  amountCents: number
  dueDate: string
  receivedAt: string | null
  status: ReceivableStatus
  paymentMethod: string | null
  notes: string | null
  saleId: string | null
  serviceOrderId: string | null
  isOverdue: boolean
}

export type AccountFilters<TStatus extends string> = {
  status: TStatus | null
  dueFrom: string | null
  dueTo: string | null
  page: number
}

export const accountPayableMutationSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1).max(255),
  amount: z.number().int().positive(),
  due_date: z.string().date("Informe a data de vencimento."),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export type AccountPayableMutationInput = z.infer<
  typeof accountPayableMutationSchema
>

export const accountSettlementMutationSchema = z.object({
  settled_at: z.string().date("Informe a data de liquidação."),
  amount: z.number().int().positive(),
  payment_method: paymentMethodSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
})

export type AccountSettlementMutationInput = z.infer<
  typeof accountSettlementMutationSchema
>

export const accountPayableCreateFormSchema = z.object({
  supplier_id: z.string(),
  description: z.string().trim().min(1, "Informe a descrição."),
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor.")
    .refine((value) => parseCurrencyInputToCents(value) > 0, {
      message: "Informe um valor maior que zero.",
    }),
  due_date: z.string().min(1, "Informe a data de vencimento."),
  notes: z.string(),
})

export type AccountPayableCreateFormValues = z.infer<
  typeof accountPayableCreateFormSchema
>

export const accountSettlementFormSchema = z.object({
  settled_at: z.string().min(1, "Informe a data."),
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor.")
    .refine((value) => parseCurrencyInputToCents(value) > 0, {
      message: "Informe um valor maior que zero.",
    }),
  payment_method: paymentMethodSchema,
  notes: z.string(),
})

export type AccountSettlementFormValues = z.infer<
  typeof accountSettlementFormSchema
>

export const defaultAccountPayableCreateFormValues: AccountPayableCreateFormValues =
  {
    supplier_id: "",
    description: "",
    amount: "0,00",
    due_date: new Date().toISOString().slice(0, 10),
    notes: "",
  }

export const defaultAccountSettlementFormValues: AccountSettlementFormValues = {
  settled_at: new Date().toISOString().slice(0, 10),
  amount: "0,00",
  payment_method: "PIX",
  notes: "",
}

export function getAccountFilters<TStatus extends string>(
  searchParams: SearchParamsLike,
  schema: z.ZodType<TStatus>
): AccountFilters<TStatus> {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const statusValue = (getValue("status") ?? "").trim()

  return {
    status: schema.safeParse(statusValue).success ? (statusValue as TStatus) : null,
    dueFrom: (getValue("due_from") ?? "").trim() || null,
    dueTo: (getValue("due_to") ?? "").trim() || null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function getFinancialPaymentMethodLabel(method: string | null) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "PIX",
    CREDIT_CARD: "Crédito",
    DEBIT_CARD: "Débito",
    BANK_TRANSFER: "Transferência",
    BOLETO: "Boleto",
    STORE_CREDIT: "Crédito da loja",
    OTHER: "Outro",
  }

  if (!method) {
    return "Não informado"
  }

  return labels[method] ?? method
}

export function getAccountStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PARTIALLY_PAID: "Parcial",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
    PARTIALLY_RECEIVED: "Parcial",
    RECEIVED: "Recebido",
  }

  return labels[status] ?? status
}

export function getAccountStatusClasses(status: string, isOverdue = false) {
  if (isOverdue) {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  const classes: Record<string, string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    PARTIALLY_PAID: "border-sky-200 bg-sky-50 text-sky-700",
    PARTIALLY_RECEIVED: "border-sky-200 bg-sky-50 text-sky-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    RECEIVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-700",
  }

  return classes[status] ?? "border-slate-200 bg-slate-100 text-slate-700"
}

export function formatFinancialCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export function toAccountPayableMutationInput(
  values: AccountPayableCreateFormValues
): AccountPayableMutationInput {
  const parsed = accountPayableCreateFormSchema.parse(values)

  return {
    supplier_id: normalizeOptionalUuid(parsed.supplier_id),
    description: parsed.description.trim(),
    amount: parseCurrencyInputToCents(parsed.amount),
    due_date: parsed.due_date,
    notes: normalizeOptionalString(parsed.notes),
  }
}

export function toAccountSettlementMutationInput(
  values: AccountSettlementFormValues
): AccountSettlementMutationInput {
  const parsed = accountSettlementFormSchema.parse(values)

  return {
    settled_at: parsed.settled_at,
    amount: parseCurrencyInputToCents(parsed.amount),
    payment_method: parsed.payment_method,
    notes: normalizeOptionalString(parsed.notes),
  }
}

export function isAccountOverdue(
  dueDate: string,
  status: string,
  settledAt?: string | null
) {
  if (settledAt) {
    return false
  }

  if (["PAID", "RECEIVED", "CANCELLED"].includes(status)) {
    return false
  }

  const today = new Date().toISOString().slice(0, 10)

  return dueDate < today
}

export function formatFinancialMoney(cents: number) {
  return formatCentsToBRL(cents)
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalUuid(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value)

  return normalized ?? null
}
