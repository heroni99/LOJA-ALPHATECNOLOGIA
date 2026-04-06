import { z } from "zod"

import {
  formatCentsToBRL,
  formatQuantity,
  maskCurrencyInput,
  parseBooleanFilter,
  parseCurrencyInputToCents,
} from "@/lib/products"

export const INVENTORY_PAGE_SIZE = 10
export const INVENTORY_MOVEMENTS_PAGE_SIZE = 20

export type SearchParamsLike = Record<string, string | string[] | undefined>

export type InventoryLocationOption = {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  active: boolean
}

export type InventoryProductOption = {
  id: string
  internalCode: string
  name: string
}

export type InventoryLocationBalance = {
  locationId: string
  locationName: string | null
  quantity: number
}

export type InventoryBalanceRow = {
  id: string
  internalCode: string
  productName: string
  categoryId: string | null
  categoryName: string | null
  stockMin: number
  totalQuantity: number
  isBelowMin: boolean
  locationBalances: InventoryLocationBalance[]
}

export type InventoryMovement = {
  id: string
  createdAt: string
  movementType: string
  productId: string
  productName: string
  internalCode: string
  locationId: string
  locationName: string | null
  quantity: number
  unitCostCents: number
  referenceType: string | null
  notes: string | null
  userName: string | null
}

export type InventoryListFilters = {
  locationId: string | null
  categoryId: string | null
  belowMin: boolean
  page: number
}

export type InventoryMovementsFilters = {
  productId: string | null
  locationId: string | null
  movementType: string | null
  page: number
}

export const inventoryEntryMutationSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  location_id: z.string().uuid("Selecione um local."),
  quantity: z.number().positive("Informe uma quantidade maior que zero."),
  unit_cost: z
    .number()
    .int("Informe um custo válido.")
    .min(0, "O custo não pode ser negativo."),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export const inventoryAdjustmentMutationSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  location_id: z.string().uuid("Selecione um local."),
  new_quantity: z
    .number()
    .min(0, "A quantidade nova não pode ser negativa."),
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo do ajuste.")
    .max(1000),
})

export const inventoryTransferMutationSchema = z
  .object({
    product_id: z.string().uuid("Selecione um produto."),
    from_location_id: z.string().uuid("Selecione o local de origem."),
    to_location_id: z.string().uuid("Selecione o local de destino."),
    quantity: z.number().positive("Informe uma quantidade maior que zero."),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (value) => value.from_location_id !== value.to_location_id,
    {
      message: "Os locais de origem e destino precisam ser diferentes.",
      path: ["to_location_id"],
    }
  )

export const stockLocationMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do local.")
    .max(120),
  description: z.string().trim().max(255).nullable().optional(),
  is_default: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type InventoryEntryMutationInput = z.infer<
  typeof inventoryEntryMutationSchema
>
export type InventoryAdjustmentMutationInput = z.infer<
  typeof inventoryAdjustmentMutationSchema
>
export type InventoryTransferMutationInput = z.infer<
  typeof inventoryTransferMutationSchema
>
export type StockLocationMutationInput = z.infer<typeof stockLocationMutationSchema>

export const inventoryEntryFormSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  location_id: z.string().uuid("Selecione um local."),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade.")
    .refine((value) => parseQuantityInput(value) > 0, {
      message: "Informe uma quantidade maior que zero.",
    }),
  unit_cost: z
    .string()
    .trim()
    .min(1, "Informe o custo unitário.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um custo válido.",
    }),
  notes: z.string().optional(),
})

export const inventoryAdjustmentFormSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  location_id: z.string().uuid("Selecione um local."),
  new_quantity: z
    .string()
    .trim()
    .min(1, "Informe a nova quantidade.")
    .refine((value) => parseQuantityInput(value) >= 0, {
      message: "Informe uma quantidade válida.",
    }),
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo do ajuste."),
})

export const inventoryTransferFormSchema = z
  .object({
    product_id: z.string().uuid("Selecione um produto."),
    from_location_id: z.string().uuid("Selecione o local de origem."),
    to_location_id: z.string().uuid("Selecione o local de destino."),
    quantity: z
      .string()
      .trim()
      .min(1, "Informe a quantidade.")
      .refine((value) => parseQuantityInput(value) > 0, {
        message: "Informe uma quantidade maior que zero.",
      }),
    notes: z.string().optional(),
  })
  .refine(
    (value) => value.from_location_id !== value.to_location_id,
    {
      message: "Os locais de origem e destino precisam ser diferentes.",
      path: ["to_location_id"],
    }
  )

export const stockLocationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do local."),
  description: z.string().optional(),
  is_default: z.boolean(),
  active: z.boolean(),
})

export type InventoryEntryFormValues = z.infer<typeof inventoryEntryFormSchema>
export type InventoryAdjustmentFormValues = z.infer<
  typeof inventoryAdjustmentFormSchema
>
export type InventoryTransferFormValues = z.infer<
  typeof inventoryTransferFormSchema
>
export type StockLocationFormValues = z.infer<typeof stockLocationFormSchema>

export const defaultInventoryEntryFormValues: InventoryEntryFormValues = {
  product_id: "",
  location_id: "",
  quantity: "1",
  unit_cost: "0,00",
  notes: "",
}

export const defaultInventoryAdjustmentFormValues: InventoryAdjustmentFormValues =
  {
    product_id: "",
    location_id: "",
    new_quantity: "0",
    reason: "",
  }

export const defaultInventoryTransferFormValues: InventoryTransferFormValues = {
  product_id: "",
  from_location_id: "",
  to_location_id: "",
  quantity: "1",
  notes: "",
}

export const defaultStockLocationFormValues: StockLocationFormValues = {
  name: "",
  description: "",
  is_default: false,
  active: true,
}

export function getInventoryListFilters(
  searchParams: SearchParamsLike
): InventoryListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)

  return {
    locationId: (getValue("location_id") ?? "").trim() || null,
    categoryId: (getValue("category_id") ?? "").trim() || null,
    belowMin: parseBooleanFilter(getValue("below_min")) ?? false,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function getInventoryMovementsFilters(
  searchParams: SearchParamsLike
): InventoryMovementsFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)

  return {
    productId: (getValue("product_id") ?? "").trim() || null,
    locationId: (getValue("location_id") ?? "").trim() || null,
    movementType: (getValue("movement_type") ?? "").trim() || null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function parseQuantityInput(value: string) {
  const normalized = value.replace(",", ".").trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatQuantityInput(value: string) {
  const normalized = value.replace(",", ".")
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    return value
  }

  return String(parsed)
}

export function toInventoryEntryMutationInput(
  values: InventoryEntryFormValues
): InventoryEntryMutationInput {
  const parsed = inventoryEntryFormSchema.parse(values)

  return {
    product_id: parsed.product_id,
    location_id: parsed.location_id,
    quantity: parseQuantityInput(parsed.quantity),
    unit_cost: parseCurrencyInputToCents(parsed.unit_cost),
    notes: normalizeOptionalString(parsed.notes),
  }
}

export function toInventoryAdjustmentMutationInput(
  values: InventoryAdjustmentFormValues
): InventoryAdjustmentMutationInput {
  const parsed = inventoryAdjustmentFormSchema.parse(values)

  return {
    product_id: parsed.product_id,
    location_id: parsed.location_id,
    new_quantity: parseQuantityInput(parsed.new_quantity),
    reason: parsed.reason.trim(),
  }
}

export function toInventoryTransferMutationInput(
  values: InventoryTransferFormValues
): InventoryTransferMutationInput {
  const parsed = inventoryTransferFormSchema.parse(values)

  return {
    product_id: parsed.product_id,
    from_location_id: parsed.from_location_id,
    to_location_id: parsed.to_location_id,
    quantity: parseQuantityInput(parsed.quantity),
    notes: normalizeOptionalString(parsed.notes),
  }
}

export function toStockLocationMutationInput(
  values: StockLocationFormValues
): StockLocationMutationInput {
  const parsed = stockLocationFormSchema.parse(values)

  return {
    name: parsed.name.trim(),
    description: normalizeOptionalString(parsed.description),
    is_default: parsed.is_default,
    active: parsed.active,
  }
}

export function getVisibleLocationBalances(
  row: InventoryBalanceRow,
  locationId: string | null,
  locationNameById?: Map<string, string>
) {
  if (!locationId) {
    return row.locationBalances.filter((balance) => balance.quantity !== 0)
  }

  const matchedBalance = row.locationBalances.find(
    (balance) => balance.locationId === locationId
  )

  return [
    {
      locationId,
      locationName: matchedBalance?.locationName ?? locationNameById?.get(locationId) ?? null,
      quantity: matchedBalance?.quantity ?? 0,
    },
  ]
}

export function formatLocationBalanceSummary(
  balances: InventoryLocationBalance[]
) {
  if (balances.length === 0) {
    return "Sem saldo"
  }

  return balances
    .map((balance) => `${balance.locationName ?? "Sem local"}: ${formatQuantity(balance.quantity)}`)
    .join(" | ")
}

export function formatInventoryCurrencyInput(value: string) {
  return maskCurrencyInput(value)
}

export {
  formatCentsToBRL,
  formatQuantity,
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
