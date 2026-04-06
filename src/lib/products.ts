import { z } from "zod"

export const PRODUCTS_PAGE_SIZE = 10

export type SearchParamsLike = Record<string, string | string[] | undefined>

export const productMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do produto."),
  category_id: z.string().uuid("Selecione uma categoria."),
  supplier_id: z.string().uuid().nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(),
  cost_price: z
    .number()
    .int("Valor inválido.")
    .min(0, "O custo não pode ser negativo."),
  sale_price: z
    .number()
    .int("Valor inválido.")
    .min(0, "O preço de venda não pode ser negativo."),
  ncm: z.string().trim().max(40).nullable().optional(),
  cest: z.string().trim().max(40).nullable().optional(),
  cfop_default: z.string().trim().max(40).nullable().optional(),
  origin_code: z.string().trim().max(40).nullable().optional(),
  is_service: z.boolean().default(false),
  has_serial_control: z.boolean().default(false),
  needs_price_review: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type ProductMutationInput = z.infer<typeof productMutationSchema>

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do produto."),
  category_id: z.string().uuid("Selecione uma categoria."),
  supplier_id: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  cost_price: z
    .string()
    .trim()
    .min(1, "Informe o custo.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um custo válido.",
    }),
  sale_price: z
    .string()
    .trim()
    .min(1, "Informe o preço de venda.")
    .refine((value) => parseCurrencyInputToCents(value) >= 0, {
      message: "Informe um preço de venda válido.",
    }),
  ncm: z.string().optional(),
  cest: z.string().optional(),
  cfop_default: z.string().optional(),
  origin_code: z.string().optional(),
  is_service: z.boolean(),
  has_serial_control: z.boolean(),
  needs_price_review: z.boolean(),
  active: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export type ProductSummary = {
  id: string
  internalCode: string
  name: string
  categoryName: string | null
  salePriceCents: number
  totalStock: number
  isService: boolean
  active: boolean
}

export type ProductFormOption = {
  id: string
  name: string
}

export type ProductDetail = {
  id: string
  internalCode: string
  name: string
  imageUrl: string | null
  categoryId: string
  categoryName: string | null
  supplierId: string | null
  supplierName: string | null
  brand: string | null
  model: string | null
  ncm: string | null
  cest: string | null
  cfopDefault: string | null
  originCode: string | null
  costPriceCents: number
  salePriceCents: number
  totalStock: number
  hasSerialControl: boolean
  needsPriceReview: boolean
  isService: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProductStockBalance = {
  id: string
  locationId: string
  locationName: string | null
  quantity: number
  updatedAt: string
}

export type ProductMovement = {
  id: string
  movementType: string
  quantity: number
  unitCostCents: number
  referenceType: string | null
  notes: string | null
  locationName: string | null
  createdAt: string
}

export type ProductListFilters = {
  search: string
  categoryId: string | null
  active: boolean | null
  page: number
}

export const defaultProductFormValues: ProductFormValues = {
  name: "",
  category_id: "",
  supplier_id: "",
  brand: "",
  model: "",
  cost_price: "0,00",
  sale_price: "0,00",
  ncm: "",
  cest: "",
  cfop_default: "",
  origin_code: "",
  is_service: false,
  has_serial_control: false,
  needs_price_review: false,
  active: true,
}

export function parseCurrencyInputToCents(value: string) {
  const digits = value.replace(/\D/g, "")

  if (!digits) {
    return 0
  }

  return Number(digits)
}

export function maskCurrencyInput(value: string) {
  const cents = parseCurrencyInputToCents(value)

  return formatCurrencyInputFromCents(cents)
}

export function formatCurrencyInputFromCents(cents: number) {
  return (Math.max(cents, 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCentsToBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Math.max(cents, 0) || 0) / 100)
}

export function parseDbMoneyToCents(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

export function formatQuantity(value: number | string | null | undefined) {
  const quantity = Number(value ?? 0)

  if (!Number.isFinite(quantity)) {
    return "0"
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(quantity) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(quantity)
}

export function parseBooleanFilter(value: string | null | undefined) {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return null
}

export function getProductListFilters(searchParams: SearchParamsLike): ProductListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)

  return {
    search: (getValue("search") ?? "").trim(),
    categoryId: (getValue("category_id") ?? "").trim() || null,
    active: parseBooleanFilter(getValue("active")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toProductMutationInput(
  values: ProductFormValues
): ProductMutationInput {
  const parsed = productFormSchema.parse(values)

  return {
    name: parsed.name.trim(),
    category_id: parsed.category_id,
    supplier_id: normalizeOptionalUuid(parsed.supplier_id),
    brand: normalizeOptionalString(parsed.brand),
    model: normalizeOptionalString(parsed.model),
    cost_price: parseCurrencyInputToCents(parsed.cost_price),
    sale_price: parseCurrencyInputToCents(parsed.sale_price),
    ncm: normalizeOptionalString(parsed.ncm),
    cest: normalizeOptionalString(parsed.cest),
    cfop_default: normalizeOptionalString(parsed.cfop_default),
    origin_code: normalizeOptionalString(parsed.origin_code),
    is_service: parsed.is_service,
    has_serial_control: parsed.has_serial_control,
    needs_price_review: parsed.needs_price_review,
    active: parsed.active,
  }
}

export function toProductFormValues(product: {
  name: string
  categoryId: string
  supplierId: string | null
  brand: string | null
  model: string | null
  costPriceCents: number
  salePriceCents: number
  ncm: string | null
  cest: string | null
  cfopDefault: string | null
  originCode: string | null
  isService: boolean
  hasSerialControl: boolean
  needsPriceReview: boolean
  active: boolean
}): ProductFormValues {
  return {
    name: product.name,
    category_id: product.categoryId,
    supplier_id: product.supplierId ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    cost_price: formatCurrencyInputFromCents(product.costPriceCents),
    sale_price: formatCurrencyInputFromCents(product.salePriceCents),
    ncm: product.ncm ?? "",
    cest: product.cest ?? "",
    cfop_default: product.cfopDefault ?? "",
    origin_code: product.originCode ?? "",
    is_service: product.isService,
    has_serial_control: product.hasSerialControl,
    needs_price_review: product.needsPriceReview,
    active: product.active,
  }
}

export function getProductStatusLabel(active: boolean) {
  return active ? "Ativo" : "Inativo"
}

export function getStockMovementLabel(movementType: string) {
  const labels: Record<string, string> = {
    IN: "Entrada",
    OUT: "Saída",
    ADJUSTMENT_POSITIVE: "Ajuste positivo",
    ADJUSTMENT_NEGATIVE: "Ajuste negativo",
    TRANSFER_IN: "Transferência recebida",
    TRANSFER_OUT: "Transferência enviada",
    SALE: "Venda",
    PURCHASE: "Compra",
    RETURN_IN: "Devolução entrada",
    RETURN_OUT: "Devolução saída",
    SERVICE_CONSUMPTION: "Consumo em OS",
    SERVICE_RETURN: "Retorno de OS",
  }

  return labels[movementType] ?? movementType
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalUuid(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value)

  return normalized ?? null
}
