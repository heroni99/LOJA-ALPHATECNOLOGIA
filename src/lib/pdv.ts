import { z } from "zod"

import {
  formatCentsToBRL,
  formatCurrencyInputFromCents,
  formatDateTime,
  formatQuantity,
  maskCurrencyInput,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const PDV_CART_STORAGE_KEY = "alpha-tecnologia:pdv-cart"
export const PDV_SEARCH_RESULT_LIMIT = 10

export const pdvPaymentMethodSchema = z.enum([
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
])

export type PdvPaymentMethod = z.infer<typeof pdvPaymentMethodSchema>

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
}

export type PdvDiscountInput = {
  mode: "amount" | "percent"
  value: string
}

export type PdvPaymentLine = {
  id: string
  method: PdvPaymentMethod
  amountInput: string
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
}

export type PdvCheckoutPaymentInput = {
  method: PdvPaymentMethod
  amount: number
  installments?: number
}

export type PdvCheckoutDiscountInput = {
  mode: "amount" | "percent"
  value: number
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
  cash_session_id: z.string().uuid("Sessão de caixa inválida."),
  customer_id: z.string().uuid().nullable().optional(),
  discount: z
    .object({
      mode: z.enum(["amount", "percent"]),
      value: z.number().min(0, "Desconto inválido."),
    })
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("Produto inválido."),
        product_unit_id: z.string().uuid().nullable().optional(),
        quantity: z.number().positive("Quantidade inválida."),
      })
    )
    .min(1, "Adicione pelo menos um item."),
  payments: z.array(
    z.object({
      method: pdvPaymentMethodSchema,
      amount: z.number().int("Valor inválido.").positive("Valor inválido."),
      installments: z
        .number()
        .int("Parcelas inválidas.")
        .positive("Parcelas inválidas.")
        .optional(),
    })
  ),
})

export type PdvCheckoutInput = z.infer<typeof pdvCheckoutSchema>

export const defaultPdvDiscount: PdvDiscountInput = {
  mode: "amount",
  value: "0,00",
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
    amountInput: formatCurrencyInputFromCents(suggestedAmountCents),
  }
}

export function getCartItemSubtotalCents(item: PdvCartItem) {
  return Math.round(item.unitPriceCents * item.quantity)
}

export function parsePdvDiscountInput(discount: PdvDiscountInput) {
  if (discount.mode === "amount") {
    return {
      mode: "amount" as const,
      value: parseCurrencyInputToCents(discount.value),
    }
  }

  const normalized = discount.value.replace(",", ".").trim()
  const parsed = Number(normalized)

  return {
    mode: "percent" as const,
    value: Number.isFinite(parsed) ? parsed : 0,
  }
}

export function resolveDiscountAmountCents(
  subtotalCents: number,
  discount: PdvDiscountInput
) {
  const parsedDiscount = parsePdvDiscountInput(discount)

  if (parsedDiscount.mode === "amount") {
    return clampDiscount(Math.round(parsedDiscount.value), subtotalCents)
  }

  const percentage = Math.min(Math.max(parsedDiscount.value, 0), 100)

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
  const normalizedPayments = paymentLines.map((payment) => ({
    ...payment,
    enteredAmountCents: parseCurrencyInputToCents(payment.amountInput),
  }))
  const totalPaidCents = normalizedPayments.reduce(
    (total, payment) => total + payment.enteredAmountCents,
    0
  )
  const nonCashPaidCents = normalizedPayments
    .filter((payment) => payment.method !== "CASH")
    .reduce((total, payment) => total + payment.enteredAmountCents, 0)
  const cashReceivedCents = normalizedPayments
    .filter((payment) => payment.method === "CASH")
    .reduce((total, payment) => total + payment.enteredAmountCents, 0)

  let remainingCents = totalCents
  const appliedPayments = normalizedPayments.map((payment) => {
    const appliedAmountCents =
      payment.method === "CASH"
        ? Math.min(payment.enteredAmountCents, Math.max(remainingCents, 0))
        : payment.enteredAmountCents

    remainingCents = Math.max(remainingCents - appliedAmountCents, 0)

    return {
      id: payment.id,
      method: payment.method,
      enteredAmountCents: payment.enteredAmountCents,
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

export function formatPdvCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export function getSuggestedPaymentAmountCents(summary: PdvCartSummary) {
  return Math.max(summary.totalCents - summary.totalPaidCents, 0)
}

export function toPdvCheckoutPayload(
  cartItems: PdvCartItem[],
  paymentLines: PdvPaymentLine[],
  discount: PdvDiscountInput,
  cashSessionId: string,
  customerId?: string | null
): PdvCheckoutInput {
  const parsedDiscount = parsePdvDiscountInput(discount)
  const payload = {
    cash_session_id: cashSessionId,
    customer_id: normalizeOptionalUuid(customerId),
    discount:
      parsedDiscount.value > 0
        ? parsedDiscount
        : null,
    items: cartItems.map((item) => ({
      product_id: item.productId,
      product_unit_id: item.productUnitId ?? null,
      quantity: item.quantity,
    })),
    payments: paymentLines
      .map((payment) => ({
        method: payment.method,
        amount: parseCurrencyInputToCents(payment.amountInput),
        installments: 1,
      }))
      .filter((payment) => payment.amount > 0),
  }

  return pdvCheckoutSchema.parse(payload)
}

export function formatPdvReceiptItemQuantity(quantity: number) {
  return formatQuantity(quantity)
}

export { formatCentsToBRL, formatDateTime, formatCurrencyInputFromCents }

function clampDiscount(discountAmountCents: number, subtotalCents: number) {
  return Math.min(Math.max(discountAmountCents, 0), Math.max(subtotalCents, 0))
}

function normalizeOptionalUuid(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
