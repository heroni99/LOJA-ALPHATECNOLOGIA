import { z } from "zod"

import { parsePurchaseOrderQuantity } from "@/lib/purchase-orders"

export const saleReturnRefundTypeSchema = z.enum([
  "CASH",
  "STORE_CREDIT",
  "EXCHANGE",
])

export type SaleReturnRefundType = z.infer<typeof saleReturnRefundTypeSchema>

export type SaleReturnSummary = {
  id: string
  saleId: string
  saleNumber: string | null
  customerName: string | null
  returnNumber: string
  reason: string
  refundType: string
  totalAmountCents: number
  createdAt: string
}

export type SaleReturnItemInputValue = {
  sale_item_id: string
  description: string
  max_quantity: number
  quantity: string
}

export type SaleReturnFormValues = {
  items: SaleReturnItemInputValue[]
  reason: string
  refund_type: SaleReturnRefundType
}

export const saleReturnFormSchema = z.object({
  items: z
    .array(
      z.object({
        sale_item_id: z.string().uuid(),
        description: z.string(),
        max_quantity: z.number().positive(),
        quantity: z
          .string()
          .trim()
          .refine((value) => {
            if (!value.trim()) {
              return true
            }

            return parsePurchaseOrderQuantity(value) >= 0
          }, "Informe uma quantidade válida."),
      })
    )
    .refine(
      (items) =>
        items.some((item) => parsePurchaseOrderQuantity(item.quantity) > 0),
      "Selecione pelo menos um item para devolução."
    ),
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo da devolução.")
    .max(2000),
  refund_type: saleReturnRefundTypeSchema,
})

export const saleReturnMutationSchema = z.object({
  sale_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
  refund_type: saleReturnRefundTypeSchema,
  items: z
    .array(
      z.object({
        sale_item_id: z.string().uuid(),
        quantity: z.number().positive(),
        return_to_stock: z.boolean().default(true),
      })
    )
    .min(1),
})

export type SaleReturnMutationInput = z.infer<typeof saleReturnMutationSchema>

export function toSaleReturnMutationInput(
  saleId: string,
  values: SaleReturnFormValues
): SaleReturnMutationInput {
  const parsed = saleReturnFormSchema.parse(values)

  return {
    sale_id: saleId,
    reason: parsed.reason.trim(),
    refund_type: parsed.refund_type,
    items: parsed.items
      .map((item) => ({
        sale_item_id: item.sale_item_id,
        quantity: parsePurchaseOrderQuantity(item.quantity),
        return_to_stock: true,
      }))
      .filter((item) => item.quantity > 0),
  }
}

export function getSaleReturnRefundTypeLabel(refundType: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    STORE_CREDIT: "Crédito",
    EXCHANGE: "Troca",
    PIX: "PIX",
    CARD_REVERSAL: "Estorno no cartão",
    OTHER: "Outro",
  }

  return labels[refundType] ?? refundType
}
