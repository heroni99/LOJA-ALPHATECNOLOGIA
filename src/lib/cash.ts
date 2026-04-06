import { z } from "zod"

import {
  formatCentsToBRL,
  formatDateTime,
  maskCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const CASH_RECENT_MOVEMENTS_LIMIT = 20

export type CashCurrentSession = {
  id: string
  cashTerminalId: string
  terminalName: string
  openedByUserId: string
  operatorName: string
  status: string
  openingAmountCents: number
  expectedAmountCents: number
  closingAmountCents: number | null
  differenceCents: number | null
  openedAt: string
  closedAt: string | null
  notes: string | null
}

export type CashSummary = {
  sessionId: string
  totalSalesCents: number
  salesCount: number
  suppliesCents: number
  withdrawalsCents: number
  expectedAmountCents: number
}

export type CashMovement = {
  id: string
  movementType: string
  amountCents: number
  paymentMethod: string | null
  description: string | null
  userName: string | null
  createdAt: string
}

export const cashSupplyMutationSchema = z.object({
  amount: z
    .number()
    .int("Informe um valor válido.")
    .positive("Informe um valor maior que zero."),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição do suprimento.")
    .max(500),
})

export const cashWithdrawalMutationSchema = z.object({
  amount: z
    .number()
    .int("Informe um valor válido.")
    .positive("Informe um valor maior que zero."),
  description: z
    .string()
    .trim()
    .min(1, "Informe o motivo da sangria.")
    .max(500),
})

export const cashCloseMutationSchema = z.object({
  closing_amount: z
    .number()
    .int("Informe um valor válido.")
    .min(0, "O valor contado não pode ser negativo."),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export type CashSupplyMutationInput = z.infer<typeof cashSupplyMutationSchema>
export type CashWithdrawalMutationInput = z.infer<
  typeof cashWithdrawalMutationSchema
>
export type CashCloseMutationInput = z.infer<typeof cashCloseMutationSchema>

export const cashSupplyFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor do suprimento.")
    .refine((value) => parseCurrencyInputToCents(value) > 0, {
      message: "Informe um valor maior que zero.",
    }),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição do suprimento."),
})

export const cashWithdrawalFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor da sangria.")
    .refine((value) => parseCurrencyInputToCents(value) > 0, {
      message: "Informe um valor maior que zero.",
    }),
  description: z
    .string()
    .trim()
    .min(1, "Informe o motivo da sangria."),
})

export const cashCloseFormSchema = z.object({
  closing_amount: z
    .string()
    .trim()
    .min(1, "Informe o valor contado.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um valor válido.",
    }),
  notes: z.string().optional(),
})

export type CashSupplyFormValues = z.infer<typeof cashSupplyFormSchema>
export type CashWithdrawalFormValues = z.infer<typeof cashWithdrawalFormSchema>
export type CashCloseFormValues = z.infer<typeof cashCloseFormSchema>

export const defaultCashSupplyFormValues: CashSupplyFormValues = {
  amount: "0,00",
  description: "",
}

export const defaultCashWithdrawalFormValues: CashWithdrawalFormValues = {
  amount: "0,00",
  description: "",
}

export const defaultCashCloseFormValues: CashCloseFormValues = {
  closing_amount: "0,00",
  notes: "",
}

export function toCashSupplyMutationInput(
  values: CashSupplyFormValues
): CashSupplyMutationInput {
  const parsed = cashSupplyFormSchema.parse(values)

  return {
    amount: parseCurrencyInputToCents(parsed.amount),
    description: parsed.description.trim(),
  }
}

export function toCashWithdrawalMutationInput(
  values: CashWithdrawalFormValues
): CashWithdrawalMutationInput {
  const parsed = cashWithdrawalFormSchema.parse(values)

  return {
    amount: parseCurrencyInputToCents(parsed.amount),
    description: parsed.description.trim(),
  }
}

export function toCashCloseMutationInput(
  values: CashCloseFormValues
): CashCloseMutationInput {
  const parsed = cashCloseFormSchema.parse(values)

  return {
    closing_amount: parseCurrencyInputToCents(parsed.closing_amount),
    notes: normalizeOptionalString(parsed.notes),
  }
}

export function formatCashCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export function getCashMovementLabel(movementType: string) {
  const labels: Record<string, string> = {
    OPENING: "Abertura",
    SALE: "Venda",
    WITHDRAWAL: "Sangria",
    SUPPLY: "Suprimento",
    REFUND: "Estorno",
    ADJUSTMENT: "Ajuste",
    CLOSING: "Fechamento",
  }

  return labels[movementType] ?? movementType
}

export function formatElapsedTime(value: string) {
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime())
  const totalMinutes = Math.floor(diffMs / 60_000)

  if (totalMinutes <= 0) {
    return "Aberto agora"
  }

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days}d`)
  }

  if (hours > 0) {
    parts.push(`${hours}h`)
  }

  if (minutes > 0 && days === 0) {
    parts.push(`${minutes}min`)
  }

  return `Há ${parts.slice(0, 2).join(" ")}`
}

export function formatSignedCentsToBRL(cents: number) {
  if (cents === 0) {
    return formatCentsToBRL(0)
  }

  return `${cents > 0 ? "+" : "-"}${formatCentsToBRL(Math.abs(cents))}`
}

export { formatCentsToBRL, formatDateTime }

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
