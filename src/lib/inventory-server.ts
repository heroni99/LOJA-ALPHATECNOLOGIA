import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  type InventoryAdjustmentMutationInput,
  INVENTORY_MOVEMENTS_PAGE_SIZE,
  INVENTORY_PAGE_SIZE,
  type InventoryBalanceRow,
  type InventoryEntryMutationInput,
  type InventoryListFilters,
  type InventoryLocationOption,
  type InventoryMovement,
  type InventoryMovementsFilters,
  type InventoryProductOption,
  type InventoryStockBalanceSnapshot,
  type InventoryTransferMutationInput,
  type StockLocationMutationInput,
} from "@/lib/inventory"
import { parseDbMoneyToCents } from "@/lib/products"

type InventoryProductRecord = {
  id: string
  internal_code: string
  name: string
  category_id: string | null
  stock_min: number | string | null
  categories?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
  stock_balances?:
    | {
        quantity: number | string | null
        location_id: string
        stock_locations?:
          | { id: string; name: string | null }
          | { id: string; name: string | null }[]
          | null
      }[]
    | null
}

type InventoryProductOptionRecord = {
  id: string
  internal_code: string
  name: string
}

type StockLocationRecord = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  active: boolean
  created_at: string
}

type InventoryMovementRecord = {
  id: string
  product_id: string
  created_at: string
  movement_type: string
  quantity: number | string | null
  unit_cost: number | string | null
  reference_type: string | null
  notes: string | null
  location_id: string
  stock_locations?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
  products?:
    | { id: string; name: string; internal_code: string }
    | { id: string; name: string; internal_code: string }[]
    | null
  profiles?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null
}

type ProductRecord = {
  id: string
  store_id: string
  is_service: boolean
}

type ListInventoryBalancesResult = {
  items: InventoryBalanceRow[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
  lowStockCount: number
}

type ListInventoryMovementsResult = {
  items: InventoryMovement[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

type DatabaseErrorLike = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function isDatabaseErrorLike(error: unknown): error is DatabaseErrorLike {
  return typeof error === "object" && error !== null
}

function normalizeInventoryError(error: unknown) {
  if (!isDatabaseErrorLike(error)) {
    return error
  }

  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ")

  if (
    error.code === "PGRST202" ||
    /Could not find the function public\.inventory_/i.test(message)
  ) {
    return new Error(
      "As funções de estoque não estão instaladas no banco. Execute `supabase/inventory.sql` no Supabase antes de usar este módulo."
    )
  }

  if (
    error.code === "23505" &&
    /stock_locations_store_id_name_key/i.test(message)
  ) {
    return new Error("Já existe um local com esse nome na loja atual.")
  }

  if (
    error.code === "23505" &&
    /idx_stock_locations_single_default_per_store/i.test(message)
  ) {
    return new Error("Já existe outro local padrão para esta loja. Tente novamente.")
  }

  if (
    error.code === "23514" &&
    /stock_locations_default_must_be_active_check/i.test(message)
  ) {
    return new Error("O local padrão precisa permanecer ativo.")
  }

  return new Error(error.message ?? "Não foi possível processar a operação de estoque.")
}

function mapInventoryBalanceRow(
  record: InventoryProductRecord,
  locationId: string | null
): InventoryBalanceRow {
  const category = getSingleRelation(record.categories)
  const locationBalances = (record.stock_balances ?? []).map((balance) => {
    const location = getSingleRelation(balance.stock_locations)
    const quantity = Number(balance.quantity ?? 0)

    return {
      locationId: balance.location_id,
      locationName: location?.name ?? null,
      quantity: Number.isFinite(quantity) ? quantity : 0,
    }
  })
  const stockMin = Number(record.stock_min ?? 0)
  const normalizedStockMin = Number.isFinite(stockMin) ? stockMin : 0
  const totalQuantity = locationBalances.reduce(
    (accumulator, balance) => accumulator + balance.quantity,
    0
  )
  const displayQuantity = locationId
    ? locationBalances.find((balance) => balance.locationId === locationId)?.quantity ?? 0
    : totalQuantity

  return {
    id: record.id,
    internalCode: record.internal_code,
    productName: record.name,
    categoryId: record.category_id,
    categoryName: category?.name ?? null,
    stockMin: normalizedStockMin,
    totalQuantity,
    displayQuantity,
    isBelowMin: displayQuantity < normalizedStockMin,
    locationBalances,
  }
}

function mapStockLocation(record: StockLocationRecord): InventoryLocationOption {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isDefault: record.is_default,
    active: record.active,
  }
}

function mapInventoryMovement(record: InventoryMovementRecord): InventoryMovement {
  const product = getSingleRelation(record.products)
  const location = getSingleRelation(record.stock_locations)
  const profile = getSingleRelation(record.profiles)
  const quantity = Number(record.quantity ?? 0)

  return {
    id: record.id,
    createdAt: record.created_at,
    movementType: record.movement_type,
    productId: record.product_id || product?.id || "",
    productName: product?.name ?? "Produto não encontrado",
    internalCode: product?.internal_code ?? "N/A",
    locationId: record.location_id,
    locationName: location?.name ?? null,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unitCostCents: parseDbMoneyToCents(record.unit_cost),
    referenceType: record.reference_type,
    notes: record.notes,
    userName: profile?.name ?? null,
  }
}

async function getProductRecord(storeId: string, productId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, store_id, is_service")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProductRecord | null) ?? null
}

async function ensureProductCanManageStock(storeId: string, productId: string) {
  const product = await getProductRecord(storeId, productId)

  if (!product || product.is_service) {
    throw new Error("O produto informado não pertence à loja atual ou não controla estoque.")
  }
}

async function ensureLocationBelongsToStore(storeId: string, locationId: string) {
  const location = await getStockLocationById(locationId, storeId)

  if (!location) {
    throw new Error("O local informado não pertence à loja atual.")
  }

  return location
}

export async function listStockLocations(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id, name, description, is_default, active, created_at")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as StockLocationRecord[]).map(mapStockLocation)
}

export async function listInventoryBalances(
  storeId: string,
  filters: InventoryListFilters
): Promise<ListInventoryBalancesResult> {
  const supabase = await createClient({ serviceRole: true })
  const pageSize = filters.limit || INVENTORY_PAGE_SIZE
  let query = supabase
    .from("products")
    .select(
      "id, internal_code, name, category_id, stock_min, categories(id, name), stock_balances(quantity, location_id, stock_locations(id, name))"
    )
    .eq("store_id", storeId)
    .eq("is_service", false)
    .order("name", { ascending: true })

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  if (filters.productId) {
    query = query.eq("id", filters.productId)
  }

  if (filters.search) {
    const sanitized = filters.search.replace(/[(),]/g, " ").trim()
    query = query.or(`name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const allRows = ((data ?? []) as InventoryProductRecord[]).map((record) =>
    mapInventoryBalanceRow(record, filters.locationId)
  )
  const lowStockCount = allRows.filter((row) => row.isBelowMin).length
  const finalRows = filters.lowStock ? allRows.filter((row) => row.isBelowMin) : allRows
  const totalCount = finalRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(filters.page, totalPages)
  const from = (currentPage - 1) * pageSize
  const items = finalRows.slice(from, from + pageSize)

  return {
    items,
    totalCount,
    totalPages,
    page: currentPage,
    pageSize,
    lowStockCount,
  }
}

export async function listInventoryMovements(
  storeId: string,
  filters: InventoryMovementsFilters
): Promise<ListInventoryMovementsResult> {
  const supabase = await createClient({ serviceRole: true })
  const locations = await listStockLocations(storeId)
  const locationIds = locations.map((location) => location.id)
  const pageSize = filters.limit || INVENTORY_MOVEMENTS_PAGE_SIZE

  if (locationIds.length === 0) {
    return {
      items: [],
      totalCount: 0,
      totalPages: 1,
      page: 1,
      pageSize,
    }
  }

  const buildQuery = (page: number) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("stock_movements")
      .select(
        "id, product_id, created_at, movement_type, quantity, unit_cost, reference_type, notes, location_id, stock_locations(id, name), products(id, name, internal_code), profiles(id, name)",
        { count: "exact" }
      )
      .in("location_id", locationIds)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (filters.productId) {
      query = query.eq("product_id", filters.productId)
    }

    if (filters.locationId) {
      query = query.eq("location_id", filters.locationId)
    }

    if (filters.movementType) {
      query = query.eq("movement_type", filters.movementType)
    }

    if (filters.dateStart) {
      query = query.gte("created_at", `${filters.dateStart}T00:00:00`)
    }

    if (filters.dateEnd) {
      query = query.lte("created_at", `${filters.dateEnd}T23:59:59.999`)
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
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
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
    items: ((data ?? []) as InventoryMovementRecord[]).map(mapInventoryMovement),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize,
  }
}

export async function getInventoryProductOptionById(
  storeId: string,
  productId: string
): Promise<InventoryProductOption | null> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, internal_code, name")
    .eq("store_id", storeId)
    .eq("is_service", false)
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const record = data as InventoryProductOptionRecord

  return {
    id: record.id,
    internalCode: record.internal_code,
    name: record.name,
  }
}

export async function getStockLocationById(locationId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id, name, description, is_default, active, created_at")
    .eq("store_id", storeId)
    .eq("id", locationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapStockLocation(data as StockLocationRecord)
}

export async function getStockBalanceByProductAndLocation(
  storeId: string,
  productId: string,
  locationId: string
): Promise<InventoryStockBalanceSnapshot | null> {
  await Promise.all([
    ensureProductCanManageStock(storeId, productId),
    ensureLocationBelongsToStore(storeId, locationId),
  ])

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_balances")
    .select("id, product_id, location_id, quantity, updated_at")
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return {
      id: null,
      productId,
      locationId,
      quantity: 0,
      updatedAt: null,
    }
  }

  const quantity = Number(data.quantity ?? 0)

  return {
    id: data.id,
    productId: data.product_id,
    locationId: data.location_id,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    updatedAt: data.updated_at,
  }
}

export async function createInventoryEntry(
  storeId: string,
  userId: string,
  input: InventoryEntryMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("inventory_entry", {
    p_store_id: storeId,
    p_user_id: userId,
    p_product_id: input.product_id,
    p_location_id: input.location_id,
    p_quantity: input.quantity,
    p_unit_cost: input.unit_cost,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw normalizeInventoryError(error)
  }

  return String(data)
}

export async function createInventoryAdjustment(
  storeId: string,
  userId: string,
  input: InventoryAdjustmentMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("inventory_adjustment", {
    p_store_id: storeId,
    p_user_id: userId,
    p_product_id: input.product_id,
    p_location_id: input.location_id,
    p_new_quantity: input.new_quantity,
    p_reason: input.reason,
  })

  if (error) {
    throw normalizeInventoryError(error)
  }

  return String(data)
}

export async function createInventoryTransfer(
  storeId: string,
  userId: string,
  input: InventoryTransferMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("inventory_transfer", {
    p_store_id: storeId,
    p_user_id: userId,
    p_product_id: input.product_id,
    p_from_location_id: input.from_location_id,
    p_to_location_id: input.to_location_id,
    p_quantity: input.quantity,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw normalizeInventoryError(error)
  }

  return String(data)
}

export async function createStockLocation(
  storeId: string,
  input: StockLocationMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("inventory_create_location", {
    p_store_id: storeId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_is_default: input.is_default,
    p_active: input.is_default ? true : input.active,
  })

  if (error) {
    throw normalizeInventoryError(error)
  }

  return getStockLocationById(String(data), storeId)
}

export async function updateStockLocation(
  locationId: string,
  storeId: string,
  input: StockLocationMutationInput
) {
  const existing = await getStockLocationById(locationId, storeId)

  if (!existing) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("inventory_update_location", {
    p_location_id: locationId,
    p_store_id: storeId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_is_default: input.is_default,
    p_active: input.is_default ? true : input.active,
  })

  if (error) {
    throw normalizeInventoryError(error)
  }

  if (!data) {
    return null
  }

  return getStockLocationById(String(data), storeId)
}
