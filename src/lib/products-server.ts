import "server-only"

import { getCurrentUser, createClient } from "@/lib/supabase/server"
import {
  PRODUCTS_PAGE_SIZE,
  type ProductDetail,
  type ProductFormOption,
  type ProductListFilters,
  type ProductMovement,
  type ProductStockBalance,
  type ProductSummary,
  parseDbMoneyToCents,
  type ProductMutationInput,
} from "@/lib/products"

type StoreContext = {
  userId: string
  storeId: string
}

type ListProductsResult = {
  items: ProductSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

type ProductFullDetail = {
  product: ProductDetail
  stockBalances: ProductStockBalance[]
  recentMovements: ProductMovement[]
}

type ProductRecord = {
  id: string
  category_id: string
  supplier_id: string | null
  name: string
  image_url: string | null
  brand: string | null
  model: string | null
  internal_code: string
  ncm: string | null
  cest: string | null
  cfop_default: string | null
  origin_code: string | null
  cost_price: number | string | null
  sale_price: number | string | null
  is_service: boolean
  has_serial_control: boolean
  needs_price_review: boolean
  active: boolean
  created_at: string
  updated_at: string
  categories?: { id: string; name: string | null } | { id: string; name: string | null }[] | null
  suppliers?:
    | { id: string; name: string | null; trade_name: string | null }
    | { id: string; name: string | null; trade_name: string | null }[]
    | null
  stock_balances?: { quantity: number | string | null }[] | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function sumStockBalances(
  balances: { quantity: number | string | null }[] | null | undefined
) {
  return (balances ?? []).reduce((accumulator, balance) => {
    const quantity = Number(balance.quantity ?? 0)

    return accumulator + (Number.isFinite(quantity) ? quantity : 0)
  }, 0)
}

function mapProductSummary(record: ProductRecord): ProductSummary {
  const category = getSingleRelation(record.categories)

  return {
    id: record.id,
    internalCode: record.internal_code,
    name: record.name,
    categoryName: category?.name ?? null,
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    totalStock: sumStockBalances(record.stock_balances),
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
    supplierName: supplier?.trade_name ?? supplier?.name ?? null,
    brand: record.brand,
    model: record.model,
    ncm: record.ncm,
    cest: record.cest,
    cfopDefault: record.cfop_default,
    originCode: record.origin_code,
    costPriceCents: parseDbMoneyToCents(record.cost_price),
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    totalStock: sumStockBalances(record.stock_balances),
    hasSerialControl: record.has_serial_control,
    needsPriceReview: record.needs_price_review,
    isService: record.is_service,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
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
    const from = (page - 1) * PRODUCTS_PAGE_SIZE
    const to = from + PRODUCTS_PAGE_SIZE - 1

    let query = supabase
      .from("products")
      .select(
        "id, internal_code, name, sale_price, is_service, active, categories(id, name), stock_balances(quantity)",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .range(from, to)

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()

      query = query.or(
        `name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,model.ilike.%${sanitized}%`
      )
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId)
    }

    if (filters.active !== null) {
      query = query.eq("active", filters.active)
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
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)

    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  const items = ((data ?? []) as ProductRecord[]).map(mapProductSummary)

  return {
    items,
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: PRODUCTS_PAGE_SIZE,
  }
}

export async function getProductById(productId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, category_id, supplier_id, name, image_url, brand, model, internal_code, ncm, cest, cfop_default, origin_code, cost_price, sale_price, has_serial_control, needs_price_review, is_service, active, created_at, updated_at, categories(id, name), suppliers(id, name, trade_name), stock_balances(quantity)"
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

  return (data ?? []).map((item) => {
    const location = getSingleRelation(item.stock_locations)

    return {
      id: item.id,
      locationId: item.location_id,
      locationName: location?.name ?? null,
      quantity: Number(item.quantity ?? 0),
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
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []).map((movement) => {
    const location = getSingleRelation(movement.stock_locations)

    return {
      id: movement.id,
      movementType: movement.movement_type,
      quantity: Number(movement.quantity ?? 0),
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

  const [stockBalances, recentMovements] = await Promise.all([
    getProductStockBalances(productId),
    getProductRecentMovements(productId),
  ])

  return {
    product,
    stockBalances,
    recentMovements,
  }
}

export async function createProduct(
  storeId: string,
  input: ProductMutationInput
) {
  const supabase = await createClient({ serviceRole: true })

  await ensureCategoryInStore(supabase, storeId, input.category_id)
  await ensureSupplierInStore(supabase, storeId, input.supplier_id ?? null)

  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      ...input,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return getProductById(data.id, storeId)
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

  const { error } = await supabase
    .from("products")
    .update(input)
    .eq("store_id", storeId)
    .eq("id", productId)

  if (error) {
    throw error
  }

  return getProductById(productId, storeId)
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
