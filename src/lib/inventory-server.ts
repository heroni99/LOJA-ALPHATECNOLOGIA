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
  categories?: { id: string; name: string | null } | { id: string; name: string | null }[] | null
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

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function mapInventoryBalanceRow(record: InventoryProductRecord): InventoryBalanceRow {
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
  const totalQuantity = locationBalances.reduce(
    (accumulator, balance) => accumulator + balance.quantity,
    0
  )

  return {
    id: record.id,
    internalCode: record.internal_code,
    productName: record.name,
    categoryId: record.category_id,
    categoryName: category?.name ?? null,
    stockMin: Number.isFinite(stockMin) ? stockMin : 0,
    totalQuantity,
    isBelowMin: totalQuantity < (Number.isFinite(stockMin) ? stockMin : 0),
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
    productId: product?.id ?? "",
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

  const { data, error } = await query

  if (error) {
    throw error
  }

  const allRows = ((data ?? []) as InventoryProductRecord[]).map(mapInventoryBalanceRow)
  const locationFilteredRows = filters.locationId
    ? allRows.filter((row) =>
        row.locationBalances.some(
          (balance) => balance.locationId === filters.locationId
        )
      )
    : allRows
  const lowStockCount = locationFilteredRows.filter((row) => row.isBelowMin).length
  const finalRows = filters.belowMin
    ? locationFilteredRows.filter((row) => row.isBelowMin)
    : locationFilteredRows
  const totalCount = finalRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / INVENTORY_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)
  const from = (currentPage - 1) * INVENTORY_PAGE_SIZE
  const items = finalRows.slice(from, from + INVENTORY_PAGE_SIZE)

  return {
    items,
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: INVENTORY_PAGE_SIZE,
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

  if (locationIds.length === 0) {
    return {
      items: [],
      totalCount: 0,
      totalPages: 1,
      page: 1,
      pageSize: INVENTORY_MOVEMENTS_PAGE_SIZE,
    }
  }

  const buildQuery = (page: number) => {
    const from = (page - 1) * INVENTORY_MOVEMENTS_PAGE_SIZE
    const to = from + INVENTORY_MOVEMENTS_PAGE_SIZE - 1

    let query = supabase
      .from("stock_movements")
      .select(
        "id, created_at, movement_type, quantity, unit_cost, reference_type, notes, location_id, stock_locations(id, name), products(id, name, internal_code), profiles(id, name)",
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
  const totalPages = Math.max(1, Math.ceil(totalCount / INVENTORY_MOVEMENTS_PAGE_SIZE))
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
    pageSize: INVENTORY_MOVEMENTS_PAGE_SIZE,
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
    throw error
  }

  return data
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
    throw error
  }

  return data
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
    throw error
  }

  return data
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
    p_active: input.active,
  })

  if (error) {
    throw error
  }

  return getStockLocationById(String(data), storeId)
}
