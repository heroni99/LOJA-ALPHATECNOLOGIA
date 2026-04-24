import "server-only"

import { getCurrentUser, createClient } from "@/lib/supabase/server"
import {
  type ProductAttachment,
  type ProductCode,
  type ProductDetail,
  type ProductFormOption,
  type ProductListFilters,
  type ProductMovement,
  type ProductMutationInput,
  type ProductAttachmentType,
  type ProductQuickSearchResult,
  type ProductStockBalance,
  type ProductSummary,
  productAttachmentTypeSchema,
  parseDbMoneyToCents,
} from "@/lib/products"

type StoreContext = {
  userId: string
  storeId: string
}

type CategoryRelation = { id: string; name: string | null } | { id: string; name: string | null }[]
type SupplierRelation =
  | { id: string; name: string | null; trade_name: string | null }
  | { id: string; name: string | null; trade_name: string | null }[]

type ProductRecord = {
  id: string
  category_id: string
  supplier_id: string | null
  name: string
  description: string | null
  image_url: string | null
  brand: string | null
  model: string | null
  internal_code: string
  supplier_code: string | null
  ncm: string | null
  cest: string | null
  cfop_default: string | null
  origin_code: string | null
  tax_category: string | null
  cost_price: number | string | null
  sale_price: number | string | null
  stock_min: number | string | null
  is_service: boolean
  has_serial_control: boolean
  needs_price_review: boolean
  active: boolean
  created_at: string
  updated_at: string
  categories?: CategoryRelation | null
  suppliers?: SupplierRelation | null
  stock_balances?: { quantity: number | string | null }[] | null
}

type ProductCodeRecord = {
  id: string
  code: string
  code_type: string
  scope: string
  is_primary: boolean
  created_at: string
}

type StockBalanceRecord = {
  id: string
  location_id: string
  quantity: number | string | null
  updated_at: string
  stock_locations?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
}

type MovementRecord = {
  id: string
  movement_type: string
  quantity: number | string | null
  unit_cost: number | string | null
  reference_type: string | null
  notes: string | null
  created_at: string
  stock_locations?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
}

type QuickSearchProductRecord = {
  id: string
  name: string
  internal_code: string
  sale_price: number | string | null
  has_serial_control: boolean
  image_url: string | null
  is_service: boolean
  active: boolean
  stock_balances?: { quantity: number | string | null }[] | null
}

type ProductAttachmentRecord = {
  id: string
  product_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size_kb: number | null
  description: string | null
  attachment_type: ProductAttachmentType
  uploaded_by: string | null
  created_at: string
}

type ProductFullDetail = {
  product: ProductDetail
  codes: ProductCode[]
  stockBalances: ProductStockBalance[]
  recentMovements: ProductMovement[]
}

type ListProductsResult = {
  items: ProductSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function parseQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

function sumStockBalances(
  balances: { quantity: number | string | null }[] | null | undefined
) {
  return (balances ?? []).reduce((accumulator, balance) => {
    return accumulator + parseQuantity(balance.quantity)
  }, 0)
}

function mapSupplierName(
  supplier:
    | { id: string; name: string | null; trade_name: string | null }
    | null
    | undefined
) {
  return supplier?.trade_name ?? supplier?.name ?? null
}

function mapProductSummary(record: ProductRecord): ProductSummary {
  const category = getSingleRelation(record.categories)
  const supplier = getSingleRelation(record.suppliers)
  const stockTotal = record.is_service ? 0 : sumStockBalances(record.stock_balances)
  const stockMin = record.is_service ? 0 : parseQuantity(record.stock_min)

  return {
    id: record.id,
    internalCode: record.internal_code,
    name: record.name,
    imageUrl: record.image_url,
    categoryId: record.category_id,
    categoryName: category?.name ?? null,
    supplierId: record.supplier_id,
    supplierName: mapSupplierName(supplier),
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    stockTotal,
    stockMin,
    isBelowMin: !record.is_service && stockTotal < stockMin,
    isService: record.is_service,
    active: record.active,
  }
}

function mapProductDetail(record: ProductRecord): ProductDetail {
  const category = getSingleRelation(record.categories)
  const supplier = getSingleRelation(record.suppliers)

  return {
    id: record.id,
    internalCode: record.internal_code,
    name: record.name,
    imageUrl: record.image_url,
    categoryId: record.category_id,
    categoryName: category?.name ?? null,
    supplierId: record.supplier_id,
    supplierName: mapSupplierName(supplier),
    description: record.description,
    brand: record.brand,
    model: record.model,
    supplierCode: record.supplier_code,
    ncm: record.ncm,
    cest: record.cest,
    cfopDefault: record.cfop_default,
    originCode: record.origin_code,
    taxCategory: record.tax_category,
    costPriceCents: parseDbMoneyToCents(record.cost_price),
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    stockMin: record.is_service ? 0 : parseQuantity(record.stock_min),
    stockTotal: record.is_service ? 0 : sumStockBalances(record.stock_balances),
    hasSerialControl: record.has_serial_control,
    needsPriceReview: record.needs_price_review,
    isService: record.is_service,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function mapProductCode(record: ProductCodeRecord): ProductCode {
  return {
    id: record.id,
    code: record.code,
    codeType: record.code_type,
    scope: record.scope,
    isPrimary: record.is_primary,
    createdAt: record.created_at,
  }
}

function mapProductAttachment(record: ProductAttachmentRecord): ProductAttachment {
  return {
    id: record.id,
    fileName: record.file_name,
    fileUrl: record.file_url,
    fileType: record.file_type,
    fileSizeKb: record.file_size_kb,
    description: record.description,
    attachmentType: productAttachmentTypeSchema.parse(record.attachment_type),
    createdAt: record.created_at,
  }
}

function mapQuickSearchProduct(record: QuickSearchProductRecord): ProductQuickSearchResult {
  return {
    id: record.id,
    name: record.name,
    internalCode: record.internal_code,
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    hasSerialControl: record.has_serial_control,
    stockTotal: record.is_service ? 0 : sumStockBalances(record.stock_balances),
    imageUrl: record.image_url,
  }
}

export async function getCurrentStoreContext(): Promise<StoreContext | null> {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data?.store_id) {
    return null
  }

  return {
    userId: user.id,
    storeId: data.store_id,
  }
}

export async function listProductCategories(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ProductFormOption[]
}

export async function listProductSuppliers(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, trade_name")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("trade_name", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((supplier) => ({
    id: supplier.id,
    name: supplier.trade_name ?? supplier.name,
  })) satisfies ProductFormOption[]
}

export async function listProducts(
  storeId: string,
  filters: ProductListFilters
): Promise<ListProductsResult> {
  const supabase = await createClient({ serviceRole: true })
  const buildQuery = (page: number) => {
    const from = (page - 1) * filters.limit
    const to = from + filters.limit - 1

    let query = supabase
      .from("products")
      .select(
        "id, category_id, supplier_id, name, image_url, internal_code, sale_price, stock_min, is_service, active, categories(id, name), suppliers(id, name, trade_name), stock_balances(quantity)",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .range(from, to)

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()
      query = query.or(
        `name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%,supplier_code.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,model.ilike.%${sanitized}%`
      )
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId)
    }

    if (filters.supplierId) {
      query = query.eq("supplier_id", filters.supplierId)
    }

    if (filters.active !== null) {
      query = query.eq("active", filters.active)
    }

    if (filters.isService !== null) {
      query = query.eq("is_service", filters.isService)
    }

    return query
  }

  const initialResult = await buildQuery(filters.page)
  let data = initialResult.data
  let error = initialResult.error
  const totalCountResult = initialResult.count

  if (error) {
    throw error
  }

  const totalCount = totalCountResult ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)
    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  return {
    items: ((data ?? []) as ProductRecord[]).map(mapProductSummary),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: filters.limit,
  }
}

export async function getProductById(productId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, category_id, supplier_id, name, description, image_url, brand, model, internal_code, supplier_code, ncm, cest, cfop_default, origin_code, tax_category, cost_price, sale_price, stock_min, has_serial_control, needs_price_review, is_service, active, created_at, updated_at, categories(id, name), suppliers(id, name, trade_name), stock_balances(quantity)"
    )
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapProductDetail(data as ProductRecord)
}

async function productExistsInStore(productId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function getProductCodes(productId: string): Promise<ProductCode[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_codes")
    .select("id, code, code_type, scope, is_primary, created_at")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as ProductCodeRecord[]).map(mapProductCode)
}

export async function getProductStockBalances(
  productId: string
): Promise<ProductStockBalance[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_balances")
    .select("id, location_id, quantity, updated_at, stock_locations(id, name)")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as StockBalanceRecord[]).map((item) => {
    const location = getSingleRelation(item.stock_locations)

    return {
      id: item.id,
      locationId: item.location_id,
      locationName: location?.name ?? null,
      quantity: parseQuantity(item.quantity),
      updatedAt: item.updated_at,
    }
  })
}

export async function getProductRecentMovements(
  productId: string
): Promise<ProductMovement[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "id, movement_type, quantity, unit_cost, reference_type, notes, created_at, stock_locations(id, name)"
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    throw error
  }

  return ((data ?? []) as MovementRecord[]).map((movement) => {
    const location = getSingleRelation(movement.stock_locations)

    return {
      id: movement.id,
      movementType: movement.movement_type,
      quantity: parseQuantity(movement.quantity),
      unitCostCents: parseDbMoneyToCents(movement.unit_cost),
      referenceType: movement.reference_type,
      notes: movement.notes,
      locationName: location?.name ?? null,
      createdAt: movement.created_at,
    }
  })
}

export async function getProductFullDetail(
  productId: string,
  storeId: string
): Promise<ProductFullDetail | null> {
  const product = await getProductById(productId, storeId)

  if (!product) {
    return null
  }

  const [codes, stockBalances, recentMovements] = await Promise.all([
    getProductCodes(productId),
    getProductStockBalances(productId),
    getProductRecentMovements(productId),
  ])

  return {
    product,
    codes,
    stockBalances: product.isService ? [] : stockBalances,
    recentMovements: product.isService ? [] : recentMovements,
  }
}

export async function listProductAttachments(
  productId: string,
  storeId: string
): Promise<ProductAttachment[] | null> {
  const exists = await productExistsInStore(productId, storeId)

  if (!exists) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_attachments")
    .select(
      "id, product_id, file_name, file_url, file_type, file_size_kb, description, attachment_type, uploaded_by, created_at"
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as ProductAttachmentRecord[]).map(mapProductAttachment)
}

export async function createProductAttachment(
  productId: string,
  storeId: string,
  userId: string,
  input: {
    fileName: string
    fileUrl: string
    fileType: string | null
    fileSizeKb: number | null
    description?: string | null
    attachmentType?: ProductAttachmentType | null
  }
): Promise<ProductAttachment | null> {
  const exists = await productExistsInStore(productId, storeId)

  if (!exists) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_attachments")
    .insert({
      product_id: productId,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_type: input.fileType,
      file_size_kb: input.fileSizeKb,
      description: normalizeOptionalText(input.description),
      attachment_type: input.attachmentType ?? "INVOICE",
      uploaded_by: userId,
    })
    .select(
      "id, product_id, file_name, file_url, file_type, file_size_kb, description, attachment_type, uploaded_by, created_at"
    )
    .single()

  if (error) {
    throw error
  }

  return mapProductAttachment(data as ProductAttachmentRecord)
}

export async function getProductAttachmentById(
  productId: string,
  attachmentId: string,
  storeId: string
): Promise<ProductAttachment | null> {
  const exists = await productExistsInStore(productId, storeId)

  if (!exists) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_attachments")
    .select(
      "id, product_id, file_name, file_url, file_type, file_size_kb, description, attachment_type, uploaded_by, created_at"
    )
    .eq("product_id", productId)
    .eq("id", attachmentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapProductAttachment(data as ProductAttachmentRecord)
}

export async function deleteProductAttachment(
  productId: string,
  attachmentId: string,
  storeId: string
): Promise<ProductAttachment | null> {
  const attachment = await getProductAttachmentById(productId, attachmentId, storeId)

  if (!attachment) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("product_attachments")
    .delete()
    .eq("product_id", productId)
    .eq("id", attachmentId)

  if (error) {
    throw error
  }

  return attachment
}

export async function createProduct(
  storeId: string,
  input: ProductMutationInput
) {
  const supabase = await createClient({ serviceRole: true })

  await ensureCategoryInStore(supabase, storeId, input.category_id)
  await ensureSupplierInStore(supabase, storeId, input.supplier_id ?? null)

  const payload = {
    store_id: storeId,
    ...input,
    stock_min: input.is_service ? 0 : input.stock_min,
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return getProductFullDetail(data.id, storeId)
}

export async function updateProduct(
  productId: string,
  storeId: string,
  input: ProductMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data: existingProduct, error: existingProductError } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle()

  if (existingProductError) {
    throw existingProductError
  }

  if (!existingProduct) {
    return null
  }

  await ensureCategoryInStore(supabase, storeId, input.category_id)
  await ensureSupplierInStore(supabase, storeId, input.supplier_id ?? null)

  const payload = {
    ...input,
    stock_min: input.is_service ? 0 : input.stock_min,
  }

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("store_id", storeId)
    .eq("id", productId)

  if (error) {
    throw error
  }

  return getProductFullDetail(productId, storeId)
}

export async function softDeleteProduct(productId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("store_id", storeId)
    .eq("id", productId)
    .select("id")
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function updateProductImageUrl(
  productId: string,
  storeId: string,
  imageUrl: string
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("store_id", storeId)
    .eq("id", productId)
    .select("id, image_url")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    id: data.id,
    imageUrl: data.image_url as string | null,
  }
}

export async function searchProductsQuick(
  storeId: string,
  rawQuery: string,
  options: {
    limit?: number
    active?: boolean | null
    isService?: boolean | null
  } = {}
) {
  const query = rawQuery.trim()

  if (!query) {
    return [] satisfies ProductQuickSearchResult[]
  }

  const limit = Math.min(Math.max(options.limit ?? 10, 1), 20)
  const sanitized = query.replace(/[(),]/g, " ").trim()
  const supabase = await createClient({ serviceRole: true })

  let directQuery = supabase
    .from("products")
    .select(
      "id, name, internal_code, sale_price, has_serial_control, image_url, is_service, active, stock_balances(quantity)"
    )
    .eq("store_id", storeId)
    .order("name", { ascending: true })
    .or(
      `name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%,supplier_code.ilike.%${sanitized}%`
    )
    .limit(limit)

  if (options.active !== null && options.active !== undefined) {
    directQuery = directQuery.eq("active", options.active)
  }

  if (options.isService !== null && options.isService !== undefined) {
    directQuery = directQuery.eq("is_service", options.isService)
  }

  const [directResult, codeResult] = await Promise.all([
    directQuery,
    supabase
      .from("product_codes")
      .select("product_id")
      .ilike("code", `%${sanitized}%`)
      .limit(limit),
  ])

  if (directResult.error) {
    throw directResult.error
  }

  if (codeResult.error) {
    throw codeResult.error
  }

  const directRows = (directResult.data ?? []) as QuickSearchProductRecord[]
  const productIds = dedupeStrings([
    ...directRows.map((product) => product.id),
    ...((codeResult.data ?? []) as { product_id: string }[]).map((code) => code.product_id),
  ])

  const missingIds = productIds.filter(
    (productId) => !directRows.some((product) => product.id === productId)
  )

  let extraRows: QuickSearchProductRecord[] = []

  if (missingIds.length > 0) {
    let extraQuery = supabase
      .from("products")
      .select(
        "id, name, internal_code, sale_price, has_serial_control, image_url, is_service, active, stock_balances(quantity)"
      )
      .eq("store_id", storeId)
      .in("id", missingIds)
      .order("name", { ascending: true })

    if (options.active !== null && options.active !== undefined) {
      extraQuery = extraQuery.eq("active", options.active)
    }

    if (options.isService !== null && options.isService !== undefined) {
      extraQuery = extraQuery.eq("is_service", options.isService)
    }

    const extraResult = await extraQuery

    if (extraResult.error) {
      throw extraResult.error
    }

    extraRows = (extraResult.data ?? []) as QuickSearchProductRecord[]
  }

  const ordered = productIds
    .map((productId) => {
      return (
        directRows.find((product) => product.id === productId) ??
        extraRows.find((product) => product.id === productId) ??
        null
      )
    })
    .filter((product): product is QuickSearchProductRecord => Boolean(product))
    .slice(0, limit)

  return ordered.map(mapQuickSearchProduct)
}

async function ensureCategoryInStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  categoryId: string
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", categoryId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("A categoria selecionada não pertence à loja atual.")
  }
}

async function ensureSupplierInStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  supplierId: string | null
) {
  if (!supplierId) {
    return
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", supplierId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("O fornecedor selecionado não pertence à loja atual.")
  }
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
