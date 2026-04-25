import { z } from "zod"

export const PRODUCTS_PAGE_SIZE = 20

export type SearchParamsLike = Record<string, string | string[] | undefined>

const optionalEightDigitCodeSchema = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .refine((value) => !value || /^\d{8}$/.test(value), {
    message: "Informe um NCM com 8 dígitos.",
  })

export const productMutationSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  category_id: z.string().uuid("Selecione uma categoria."),
  supplier_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(),
  supplier_code: z.string().trim().max(120).nullable().optional(),
  cost_price: z
    .number()
    .int("Valor inválido.")
    .min(0, "O custo não pode ser negativo."),
  sale_price: z
    .number()
    .int("Valor inválido.")
    .min(0, "O preço de venda não pode ser negativo."),
  stock_min: z
    .number()
    .min(0, "O estoque mínimo não pode ser negativo."),
  ncm: optionalEightDigitCodeSchema,
  cest: z.string().trim().max(40).nullable().optional(),
  cfop_default: z.string().trim().max(40).nullable().optional(),
  origin_code: z.string().trim().max(40).nullable().optional(),
  tax_category: z.string().trim().max(120).nullable().optional(),
  is_service: z.boolean().default(false),
  has_serial_control: z.boolean().default(false),
  needs_price_review: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type ProductMutationInput = z.infer<typeof productMutationSchema>

export const productCreateMutationSchema = productMutationSchema.extend({
  initial_stock: z
    .number()
    .min(0, "O estoque inicial não pode ser negativo.")
    .default(0),
})

export type ProductCreateMutationInput = z.infer<typeof productCreateMutationSchema>

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  category_id: z.string().uuid("Selecione uma categoria."),
  supplier_id: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  supplier_code: z.string().optional(),
  cost_price: z.number().int("Informe um custo válido.").min(0, "O custo não pode ser negativo."),
  sale_price: z
    .number()
    .int("Informe um preço válido.")
    .min(0, "O preço de venda não pode ser negativo."),
  stock_min: z
    .string()
    .trim()
    .refine((value) => parseDecimalInput(value) >= 0, {
      message: "Informe um estoque mínimo válido.",
    }),
  initial_stock: z
    .string()
    .trim()
    .refine((value) => parseDecimalInput(value) >= 0, {
      message: "Informe um estoque inicial válido.",
    }),
  ncm: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^\d{8}$/.test(value), {
      message: "Informe um NCM com 8 dígitos.",
    }),
  cest: z.string().optional(),
  cfop_default: z.string().optional(),
  origin_code: z.string().optional(),
  tax_category: z.string().optional(),
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
  imageUrl: string | null
  categoryId: string
  categoryName: string | null
  supplierId: string | null
  supplierName: string | null
  salePriceCents: number
  stockTotal: number
  stockMin: number
  isBelowMin: boolean
  isService: boolean
  active: boolean
}

export type ProductFormOption = {
  id: string
  name: string
}

export type ProductCode = {
  id: string
  code: string
  codeType: string
  scope: string
  isPrimary: boolean
  createdAt: string
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
  description: string | null
  brand: string | null
  model: string | null
  supplierCode: string | null
  ncm: string | null
  cest: string | null
  cfopDefault: string | null
  originCode: string | null
  taxCategory: string | null
  costPriceCents: number
  salePriceCents: number
  stockMin: number
  stockTotal: number
  hasSerialControl: boolean
  needsPriceReview: boolean
  isService: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export const productAttachmentTypeSchema = z.enum([
  "INVOICE",
  "WARRANTY",
  "MANUAL",
  "OTHER",
])

export type ProductAttachmentType = z.infer<typeof productAttachmentTypeSchema>

export type ProductAttachment = {
  id: string
  fileName: string
  fileUrl: string
  fileType: string | null
  fileSizeKb: number | null
  description: string | null
  attachmentType: ProductAttachmentType
  createdAt: string
}

export type ProductStockBalance = {
  id: string
  locationId: string
  locationName: string | null
  locationActive: boolean
  quantity: number
  updatedAt: string | null
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
  supplierId: string | null
  active: boolean | null
  isService: boolean | null
  page: number
  limit: number
}

export type ProductQuickSearchResult = {
  id: string
  name: string
  internalCode: string
  salePriceCents: number
  hasSerialControl: boolean
  stockTotal: number
  imageUrl: string | null
}

export type ProductStockLevel = "out" | "below_min" | "at_min" | "above_min"

export const defaultProductFormValues: ProductFormValues = {
  name: "",
  category_id: "",
  supplier_id: "",
  description: "",
  brand: "",
  model: "",
  supplier_code: "",
  cost_price: 0,
  sale_price: 0,
  stock_min: "0",
  initial_stock: "0",
  ncm: "",
  cest: "",
  cfop_default: "",
  origin_code: "",
  tax_category: "",
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

export function getProductStockLevel(
  quantity: number | string | null | undefined,
  stockMin: number | string | null | undefined
): ProductStockLevel {
  const normalizedQuantity = Number(quantity ?? 0)
  const normalizedStockMin = Number(stockMin ?? 0)

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return "out"
  }

  if (Number.isFinite(normalizedStockMin) && normalizedQuantity < normalizedStockMin) {
    return "below_min"
  }

  if (Number.isFinite(normalizedStockMin) && normalizedQuantity === normalizedStockMin) {
    return "at_min"
  }

  return "above_min"
}

export function getProductStockLevelLabel(level: ProductStockLevel) {
  const labels: Record<ProductStockLevel, string> = {
    out: "Sem estoque",
    below_min: "Estoque baixo",
    at_min: "Estoque baixo",
    above_min: "OK",
  }

  return labels[level]
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

export function parseDecimalInput(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\s+/g, "").replace(",", ".")
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatDecimalInput(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  if (!Number.isFinite(parsed)) {
    return "0"
  }

  if (Number.isInteger(parsed)) {
    return String(parsed)
  }

  return parsed.toString()
}

export function getProductListFilters(searchParams: SearchParamsLike): ProductListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const limit = Number.parseInt(getValue("limit") ?? String(PRODUCTS_PAGE_SIZE), 10)

  return {
    search: (getValue("search") ?? "").trim(),
    categoryId: (getValue("category_id") ?? "").trim() || null,
    supplierId: (getValue("supplier_id") ?? "").trim() || null,
    active: parseBooleanFilter(getValue("active")),
    isService: parseBooleanFilter(getValue("is_service")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit:
      Number.isFinite(limit) && limit > 0
        ? Math.min(Math.max(limit, 1), 100)
        : PRODUCTS_PAGE_SIZE,
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
    description: normalizeOptionalString(parsed.description),
    brand: normalizeOptionalString(parsed.brand),
    model: normalizeOptionalString(parsed.model),
    supplier_code: normalizeOptionalString(parsed.supplier_code),
    cost_price: parsed.cost_price,
    sale_price: parsed.sale_price,
    stock_min: parsed.is_service ? 0 : parseDecimalInput(parsed.stock_min),
    ncm: normalizeOptionalString(parsed.ncm),
    cest: normalizeOptionalString(parsed.cest),
    cfop_default: normalizeOptionalString(parsed.cfop_default),
    origin_code: normalizeOptionalString(parsed.origin_code),
    tax_category: normalizeOptionalString(parsed.tax_category),
    is_service: parsed.is_service,
    has_serial_control: parsed.has_serial_control,
    needs_price_review: parsed.needs_price_review,
    active: parsed.active,
  }
}

export function getProductInitialStock(
  values: Pick<ProductFormValues, "initial_stock" | "is_service">
) {
  return values.is_service ? 0 : parseDecimalInput(values.initial_stock)
}

export function toProductFormValues(product: {
  name: string
  categoryId: string
  supplierId: string | null
  description: string | null
  brand: string | null
  model: string | null
  supplierCode: string | null
  costPriceCents: number
  salePriceCents: number
  stockMin: number
  ncm: string | null
  cest: string | null
  cfopDefault: string | null
  originCode: string | null
  taxCategory: string | null
  isService: boolean
  hasSerialControl: boolean
  needsPriceReview: boolean
  active: boolean
}): ProductFormValues {
  return {
    name: product.name,
    category_id: product.categoryId,
    supplier_id: product.supplierId ?? "",
    description: product.description ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    supplier_code: product.supplierCode ?? "",
    cost_price: product.costPriceCents,
    sale_price: product.salePriceCents,
    stock_min: formatDecimalInput(product.stockMin),
    initial_stock: "0",
    ncm: product.ncm ?? "",
    cest: product.cest ?? "",
    cfop_default: product.cfopDefault ?? "",
    origin_code: product.originCode ?? "",
    tax_category: product.taxCategory ?? "",
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

export function getProductAttachmentTypeLabel(type: ProductAttachmentType) {
  const labels: Record<ProductAttachmentType, string> = {
    INVOICE: "Nota fiscal de compra",
    WARRANTY: "Garantia",
    MANUAL: "Manual",
    OTHER: "Outro",
  }

  return labels[type]
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
