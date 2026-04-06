import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  PURCHASE_ORDERS_PAGE_SIZE,
  type PurchaseOrderDetail,
  type PurchaseOrderFormProductOption,
  type PurchaseOrderFormSupplierOption,
  type PurchaseOrderItemSummary,
  type PurchaseOrderListFilters,
  type PurchaseOrderMutationInput,
  type PurchaseOrderReceiveMutationInput,
  type PurchaseOrderSummary,
} from "@/lib/purchase-orders"
import { parseDbMoneyToCents } from "@/lib/products"

type PurchaseOrderRecord = {
  id: string
  supplier_id: string
  order_number: string
  status: PurchaseOrderDetail["status"]
  notes: string | null
  subtotal: number | string | null
  total: number | string | null
  ordered_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
}

type PurchaseOrderItemRecord = {
  id: string
  product_id: string | null
  description: string
  quantity: number | string | null
  unit_cost: number | string | null
  total_cost: number | string | null
  received_quantity: number | string | null
}

type SupplierRecord = {
  id: string
  name: string | null
  trade_name: string | null
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
  has_serial_control: boolean
}

type ListPurchaseOrdersResult = {
  items: PurchaseOrderSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

function formatSupplierName(supplier: SupplierRecord | null | undefined) {
  return supplier?.trade_name ?? supplier?.name ?? null
}

function mapPurchaseOrderItem(
  item: PurchaseOrderItemRecord,
  productMap: Map<string, ProductRecord>
): PurchaseOrderItemSummary {
  const product = item.product_id ? productMap.get(item.product_id) ?? null : null
  const quantity = Number(item.quantity ?? 0)
  const receivedQuantity = Number(item.received_quantity ?? 0)

  return {
    id: item.id,
    productId: item.product_id,
    productName: product?.name ?? null,
    internalCode: product?.internal_code ?? null,
    description: item.description,
    quantity,
    unitCostCents: parseDbMoneyToCents(item.unit_cost),
    totalCostCents: parseDbMoneyToCents(item.total_cost),
    receivedQuantity,
    remainingQuantity: Math.max(0, quantity - receivedQuantity),
  }
}

async function listSuppliersByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, SupplierRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, trade_name")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as SupplierRecord[]).map((record) => [record.id, record]))
}

async function listProductsByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProductRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, has_serial_control")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProductRecord[]).map((record) => [record.id, record]))
}

async function searchSupplierIds(storeId: string, search: string) {
  const normalized = search.trim()

  if (!normalized) {
    return [] as string[]
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("store_id", storeId)
    .or(`name.ilike.%${normalized}%,trade_name.ilike.%${normalized}%`)
    .limit(50)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => item.id)
}

async function getPurchaseOrderRecord(purchaseOrderId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "id, supplier_id, order_number, status, notes, subtotal, total, ordered_at, received_at, created_at, updated_at"
    )
    .eq("store_id", storeId)
    .eq("id", purchaseOrderId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as PurchaseOrderRecord | null) ?? null
}

export async function listPurchaseOrderSuppliers(storeId: string) {
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

  return ((data ?? []) as SupplierRecord[]).map((supplier) => ({
    id: supplier.id,
    name: formatSupplierName(supplier) ?? "Fornecedor",
  })) satisfies PurchaseOrderFormSupplierOption[]
}

export async function listPurchaseOrderProducts(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, has_serial_control")
    .eq("store_id", storeId)
    .eq("active", true)
    .eq("is_service", false)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as ProductRecord[]).map((product) => ({
    id: product.id,
    label: `${product.internal_code} - ${product.name}`,
    hasSerialControl: product.has_serial_control,
  })) satisfies PurchaseOrderFormProductOption[]
}

export async function listPurchaseOrders(
  storeId: string,
  filters: PurchaseOrderListFilters
): Promise<ListPurchaseOrdersResult> {
  const supabase = await createClient({ serviceRole: true })
  const matchingSupplierIds = filters.search
    ? await searchSupplierIds(storeId, filters.search)
    : []

  const buildQuery = (page: number) => {
    const from = (page - 1) * PURCHASE_ORDERS_PAGE_SIZE
    const to = from + PURCHASE_ORDERS_PAGE_SIZE - 1
    let query = supabase
      .from("purchase_orders")
      .select(
        "id, supplier_id, order_number, status, total, ordered_at, created_at",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()
      const clauses = [`order_number.ilike.%${sanitized}%`]

      if (matchingSupplierIds.length > 0) {
        clauses.push(`supplier_id.in.(${matchingSupplierIds.join(",")})`)
      }

      query = query.or(clauses.join(","))
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
  const totalPages = Math.max(1, Math.ceil(totalCount / PURCHASE_ORDERS_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)

    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  const records = (data ?? []) as Array<
    Pick<
      PurchaseOrderRecord,
      "id" | "supplier_id" | "order_number" | "status" | "ordered_at" | "created_at"
    > & { total: number | string | null }
  >
  const supplierIds = Array.from(new Set(records.map((record) => record.supplier_id)))
  const supplierMap = await listSuppliersByIds(storeId, supplierIds)
  const pendingItemsByOrder = new Map<string, number>()

  if (records.length > 0) {
    const supabaseItems = await createClient({ serviceRole: true })
    const { data: itemData, error: itemError } = await supabaseItems
      .from("purchase_order_items")
      .select("purchase_order_id, quantity, received_quantity")
      .in(
        "purchase_order_id",
        records.map((record) => record.id)
      )

    if (itemError) {
      throw itemError
    }

    for (const item of itemData ?? []) {
      const remaining =
        Number(item.quantity ?? 0) - Number(item.received_quantity ?? 0) > 0 ? 1 : 0
      pendingItemsByOrder.set(
        item.purchase_order_id,
        (pendingItemsByOrder.get(item.purchase_order_id) ?? 0) + remaining
      )
    }
  }

  return {
    items: records.map((record) => ({
      id: record.id,
      orderNumber: record.order_number,
      supplierId: record.supplier_id,
      supplierName: formatSupplierName(supplierMap.get(record.supplier_id)),
      status: record.status,
      totalCents: parseDbMoneyToCents(record.total),
      orderedAt: record.ordered_at,
      createdAt: record.created_at,
      pendingItems: pendingItemsByOrder.get(record.id) ?? 0,
    })),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: PURCHASE_ORDERS_PAGE_SIZE,
  }
}

export async function getPurchaseOrderFullDetail(
  purchaseOrderId: string,
  storeId: string
): Promise<PurchaseOrderDetail | null> {
  const purchaseOrder = await getPurchaseOrderRecord(purchaseOrderId, storeId)

  if (!purchaseOrder) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const [supplierMap, itemsResult] = await Promise.all([
    listSuppliersByIds(storeId, [purchaseOrder.supplier_id]),
    supabase
      .from("purchase_order_items")
      .select(
        "id, product_id, description, quantity, unit_cost, total_cost, received_quantity"
      )
      .eq("purchase_order_id", purchaseOrderId)
      .order("created_at", { ascending: true }),
  ])

  if (itemsResult.error) {
    throw itemsResult.error
  }

  const itemRecords = (itemsResult.data ?? []) as PurchaseOrderItemRecord[]
  const productIds = Array.from(
    new Set(
      itemRecords
        .map((item) => item.product_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const productMap = await listProductsByIds(storeId, productIds)

  return {
    id: purchaseOrder.id,
    supplierId: purchaseOrder.supplier_id,
    supplierName: formatSupplierName(supplierMap.get(purchaseOrder.supplier_id)),
    orderNumber: purchaseOrder.order_number,
    status: purchaseOrder.status,
    notes: purchaseOrder.notes,
    subtotalCents: parseDbMoneyToCents(purchaseOrder.subtotal),
    totalCents: parseDbMoneyToCents(purchaseOrder.total),
    orderedAt: purchaseOrder.ordered_at,
    receivedAt: purchaseOrder.received_at,
    createdAt: purchaseOrder.created_at,
    updatedAt: purchaseOrder.updated_at,
    items: itemRecords.map((item) => mapPurchaseOrderItem(item, productMap)),
  }
}

export async function createPurchaseOrder(
  storeId: string,
  userId: string,
  input: PurchaseOrderMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("purchase_order_create", {
    p_store_id: storeId,
    p_user_id: userId,
    p_supplier_id: input.supplier_id,
    p_notes: input.notes ?? null,
    p_items: input.items,
  })

  if (error) {
    throw error
  }

  return getPurchaseOrderFullDetail(String(data), storeId)
}

export async function updatePurchaseOrder(
  purchaseOrderId: string,
  storeId: string,
  input: PurchaseOrderMutationInput
) {
  const existing = await getPurchaseOrderRecord(purchaseOrderId, storeId)

  if (!existing) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase.rpc("purchase_order_update", {
    p_store_id: storeId,
    p_purchase_order_id: purchaseOrderId,
    p_supplier_id: input.supplier_id,
    p_notes: input.notes ?? null,
    p_items: input.items,
  })

  if (error) {
    throw error
  }

  return getPurchaseOrderFullDetail(purchaseOrderId, storeId)
}

export async function cancelPurchaseOrder(
  purchaseOrderId: string,
  storeId: string
) {
  const existing = await getPurchaseOrderRecord(purchaseOrderId, storeId)

  if (!existing) {
    return null
  }

  if (["PARTIALLY_RECEIVED", "RECEIVED"].includes(existing.status)) {
    throw new Error("Pedidos com recebimento lançado não podem ser cancelados.")
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("id", purchaseOrderId)

  if (error) {
    throw error
  }

  return getPurchaseOrderFullDetail(purchaseOrderId, storeId)
}

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  storeId: string,
  userId: string,
  input: PurchaseOrderReceiveMutationInput
) {
  const existing = await getPurchaseOrderRecord(purchaseOrderId, storeId)

  if (!existing) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("purchase_order_receive", {
    p_store_id: storeId,
    p_user_id: userId,
    p_purchase_order_id: purchaseOrderId,
    p_due_date: input.due_date,
    p_notes: input.notes ?? null,
    p_items: input.items,
  })

  if (error) {
    throw error
  }

  return {
    referenceId: String(data),
    purchaseOrder: await getPurchaseOrderFullDetail(purchaseOrderId, storeId),
  }
}
