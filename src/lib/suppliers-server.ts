import "server-only"

import { createClient } from "@/lib/supabase/server"
import { parseDbMoneyToCents } from "@/lib/products"
import {
  SUPPLIERS_PAGE_SIZE,
  type SupplierDetail,
  type SupplierListFilters,
  type SupplierMutationInput,
  type SupplierProduct,
  type SupplierPurchaseOrder,
  type SupplierSummary,
} from "@/lib/suppliers"

type SupplierRecord = {
  id: string
  name: string
  trade_name: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  contact_name: string | null
  zip_code: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type ListSuppliersResult = {
  items: SupplierSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

type SupplierFullDetail = {
  supplier: SupplierDetail
  products: SupplierProduct[]
  purchaseOrders: SupplierPurchaseOrder[]
}

function mapSupplierSummary(record: SupplierRecord): SupplierSummary {
  return {
    id: record.id,
    name: record.name,
    cnpj: record.cnpj,
    phone: record.phone,
    city: record.city,
    active: record.active,
  }
}

function mapSupplierDetail(record: SupplierRecord): SupplierDetail {
  return {
    id: record.id,
    name: record.name,
    tradeName: record.trade_name,
    cnpj: record.cnpj,
    email: record.email,
    phone: record.phone,
    contactName: record.contact_name,
    zipCode: record.zip_code,
    address: record.address,
    city: record.city,
    state: record.state,
    notes: record.notes,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export async function listSuppliers(
  storeId: string,
  filters: SupplierListFilters
): Promise<ListSuppliersResult> {
  const supabase = await createClient({ serviceRole: true })
  const buildQuery = (page: number) => {
    const from = (page - 1) * SUPPLIERS_PAGE_SIZE
    const to = from + SUPPLIERS_PAGE_SIZE - 1

    let query = supabase
      .from("suppliers")
      .select("id, name, cnpj, phone, city, active, created_at, updated_at", {
        count: "exact",
      })
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .range(from, to)

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()

      query = query.or(
        `name.ilike.%${sanitized}%,cnpj.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`
      )
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
  const totalPages = Math.max(1, Math.ceil(totalCount / SUPPLIERS_PAGE_SIZE))
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
    items: ((data ?? []) as SupplierRecord[]).map(mapSupplierSummary),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: SUPPLIERS_PAGE_SIZE,
  }
}

export async function getSupplierById(supplierId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, name, trade_name, cnpj, email, phone, contact_name, zip_code, address, city, state, notes, active, created_at, updated_at"
    )
    .eq("store_id", storeId)
    .eq("id", supplierId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapSupplierDetail(data as SupplierRecord)
}

export async function getSupplierProducts(
  supplierId: string,
  storeId: string
): Promise<SupplierProduct[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, internal_code, name, sale_price, active")
    .eq("store_id", storeId)
    .eq("supplier_id", supplierId)
    .order("name", { ascending: true })
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []).map((product) => ({
    id: product.id,
    internalCode: product.internal_code,
    name: product.name,
    salePriceCents: parseDbMoneyToCents(product.sale_price),
    active: product.active,
  }))
}

export async function getSupplierPurchaseOrders(
  supplierId: string,
  storeId: string
): Promise<SupplierPurchaseOrder[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, order_number, status, total, ordered_at, created_at")
    .eq("store_id", storeId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []).map((purchaseOrder) => ({
    id: purchaseOrder.id,
    orderNumber: purchaseOrder.order_number,
    status: purchaseOrder.status,
    totalCents: parseDbMoneyToCents(purchaseOrder.total),
    orderedAt: purchaseOrder.ordered_at,
    createdAt: purchaseOrder.created_at,
  }))
}

export async function getSupplierFullDetail(
  supplierId: string,
  storeId: string
): Promise<SupplierFullDetail | null> {
  const supplier = await getSupplierById(supplierId, storeId)

  if (!supplier) {
    return null
  }

  const [products, purchaseOrders] = await Promise.all([
    getSupplierProducts(supplierId, storeId),
    getSupplierPurchaseOrders(supplierId, storeId),
  ])

  return {
    supplier,
    products,
    purchaseOrders,
  }
}

export async function createSupplier(
  storeId: string,
  input: SupplierMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      store_id: storeId,
      ...input,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return getSupplierById(data.id, storeId)
}

export async function updateSupplier(
  supplierId: string,
  storeId: string,
  input: SupplierMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data: existingSupplier, error: existingSupplierError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", supplierId)
    .maybeSingle()

  if (existingSupplierError) {
    throw existingSupplierError
  }

  if (!existingSupplier) {
    return null
  }

  const { error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("store_id", storeId)
    .eq("id", supplierId)

  if (error) {
    throw error
  }

  return getSupplierById(supplierId, storeId)
}

export async function deleteSupplier(supplierId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("store_id", storeId)
    .eq("id", supplierId)

  if (error) {
    throw error
  }
}
