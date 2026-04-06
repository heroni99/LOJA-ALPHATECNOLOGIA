import "server-only"

import { createClient } from "@/lib/supabase/server"
import { listSaleReturnsBySale } from "@/lib/sale-returns-server"
import {
  SALES_PAGE_SIZE,
  type SaleDetail,
  type SaleDetailItem,
  type SaleListFilters,
  type SaleSummary,
} from "@/lib/sales"
import { parseDbMoneyToCents } from "@/lib/products"

type SaleRecord = {
  id: string
  customer_id: string | null
  user_id: string
  sale_number: string
  total: number | string | null
  subtotal: number | string | null
  discount_amount: number | string | null
  status: SaleDetail["status"]
  completed_at: string | null
  created_at: string
}

type SaleItemRecord = {
  id: string
  product_id: string
  product_unit_id: string | null
  quantity: number | string | null
  unit_price: number | string | null
  total_price: number | string | null
}

type SalePaymentRecord = {
  id: string
  method: string
  amount: number | string | null
  installments: number
}

type CustomerRecord = {
  id: string
  name: string
}

type ProfileRecord = {
  id: string
  name: string | null
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
}

type ProductUnitRecord = {
  id: string
  imei: string | null
  imei2: string | null
  serial_number: string | null
}

type ListSalesResult = {
  items: SaleSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

function parseQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

async function searchCustomerIds(storeId: string, search: string) {
  const normalized = search.trim()

  if (!normalized) {
    return [] as string[]
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .ilike("name", `%${normalized}%`)
    .limit(50)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => item.id)
}

async function listCustomersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, CustomerRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as CustomerRecord[]).map((item) => [item.id, item]))
}

async function listProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProfileRecord[]).map((item) => [item.id, item]))
}

async function listProductsByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProductRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProductRecord[]).map((item) => [item.id, item]))
}

async function listProductUnitsByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProductUnitRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_units")
    .select("id, imei, imei2, serial_number")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProductUnitRecord[]).map((item) => [item.id, item]))
}

async function getSaleRecord(saleId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, customer_id, user_id, sale_number, total, subtotal, discount_amount, status, completed_at, created_at"
    )
    .eq("store_id", storeId)
    .eq("id", saleId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as SaleRecord | null) ?? null
}

export async function listSales(
  storeId: string,
  filters: SaleListFilters
): Promise<ListSalesResult> {
  const supabase = await createClient({ serviceRole: true })
  const matchingCustomerIds = filters.search
    ? await searchCustomerIds(storeId, filters.search)
    : []

  const buildQuery = (page: number) => {
    const from = (page - 1) * SALES_PAGE_SIZE
    const to = from + SALES_PAGE_SIZE - 1
    let query = supabase
      .from("sales")
      .select(
        "id, customer_id, user_id, sale_number, total, status, completed_at, created_at",
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
      const clauses = [`sale_number.ilike.%${sanitized}%`]

      if (matchingCustomerIds.length > 0) {
        clauses.push(`customer_id.in.(${matchingCustomerIds.join(",")})`)
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
  const totalPages = Math.max(1, Math.ceil(totalCount / SALES_PAGE_SIZE))
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
      SaleRecord,
      "id" | "customer_id" | "user_id" | "sale_number" | "status" | "completed_at" | "created_at"
    > & { total: number | string | null }
  >
  const customerIds = Array.from(
    new Set(
      records
        .map((record) => record.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const userIds = Array.from(new Set(records.map((record) => record.user_id)))
  const [customerMap, profileMap] = await Promise.all([
    listCustomersByIds(customerIds),
    listProfilesByIds(userIds),
  ])

  return {
    items: records.map((record) => ({
      id: record.id,
      saleNumber: record.sale_number,
      customerName: record.customer_id
        ? customerMap.get(record.customer_id)?.name ?? null
        : null,
      operatorName: profileMap.get(record.user_id)?.name ?? null,
      totalCents: parseDbMoneyToCents(record.total),
      status: record.status,
      completedAt: record.completed_at,
      createdAt: record.created_at,
    })),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: SALES_PAGE_SIZE,
  }
}

export async function getSaleFullDetail(
  saleId: string,
  storeId: string
): Promise<SaleDetail | null> {
  const sale = await getSaleRecord(saleId, storeId)

  if (!sale) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const [itemsResult, paymentsResult, returns, customerMap, profileMap] =
    await Promise.all([
      supabase
        .from("sale_items")
        .select("id, product_id, product_unit_id, quantity, unit_price, total_price")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: true }),
      supabase
        .from("sale_payments")
        .select("id, method, amount, installments")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: true }),
      listSaleReturnsBySale(saleId, storeId),
      listCustomersByIds(sale.customer_id ? [sale.customer_id] : []),
      listProfilesByIds([sale.user_id]),
    ])

  if (itemsResult.error) {
    throw itemsResult.error
  }

  if (paymentsResult.error) {
    throw paymentsResult.error
  }

  const itemRecords = (itemsResult.data ?? []) as SaleItemRecord[]
  const productIds = Array.from(new Set(itemRecords.map((item) => item.product_id)))
  const unitIds = Array.from(
    new Set(
      itemRecords
        .map((item) => item.product_unit_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const [productMap, unitMap, returnedItemsResult] = await Promise.all([
    listProductsByIds(storeId, productIds),
    listProductUnitsByIds(unitIds),
    supabase
      .from("sale_return_items")
      .select("sale_item_id, quantity")
      .in(
        "sale_item_id",
        itemRecords.map((item) => item.id)
      ),
  ])

  if (returnedItemsResult.error) {
    throw returnedItemsResult.error
  }

  const returnedQuantityMap = new Map<string, number>()
  for (const row of (returnedItemsResult.data ?? []) as Array<{
    sale_item_id: string
    quantity: number | string | null
  }>) {
    returnedQuantityMap.set(
      row.sale_item_id,
      (returnedQuantityMap.get(row.sale_item_id) ?? 0) + parseQuantity(row.quantity)
    )
  }

  const items: SaleDetailItem[] = itemRecords.map((item) => {
    const product = productMap.get(item.product_id)
    const unit = item.product_unit_id ? unitMap.get(item.product_unit_id) ?? null : null
    const returnedQuantity = returnedQuantityMap.get(item.id) ?? 0
    const quantity = parseQuantity(item.quantity)

    return {
      id: item.id,
      productId: item.product_id,
      productUnitId: item.product_unit_id,
      name: product?.name ?? "Produto",
      internalCode: product?.internal_code ?? "N/A",
      imeiOrSerial: unit?.imei ?? unit?.serial_number ?? unit?.imei2 ?? null,
      quantity,
      unitPriceCents: parseDbMoneyToCents(item.unit_price),
      totalPriceCents: parseDbMoneyToCents(item.total_price),
      returnedQuantity,
      availableReturnQuantity: Math.max(0, quantity - returnedQuantity),
    }
  })

  return {
    id: sale.id,
    saleNumber: sale.sale_number,
    customerId: sale.customer_id,
    customerName: sale.customer_id
      ? customerMap.get(sale.customer_id)?.name ?? null
      : null,
    operatorName: profileMap.get(sale.user_id)?.name ?? null,
    status: sale.status,
    subtotalCents: parseDbMoneyToCents(sale.subtotal),
    discountAmountCents: parseDbMoneyToCents(sale.discount_amount),
    totalCents: parseDbMoneyToCents(sale.total),
    completedAt: sale.completed_at,
    createdAt: sale.created_at,
    items,
    payments: ((paymentsResult.data ?? []) as SalePaymentRecord[]).map((payment) => ({
      id: payment.id,
      method: payment.method,
      amountCents: parseDbMoneyToCents(payment.amount),
      installments: payment.installments,
    })),
    returns: returns.map((entry) => ({
      id: entry.id,
      returnNumber: entry.returnNumber,
      refundType: entry.refundType,
      reason: entry.reason,
      totalAmountCents: entry.totalAmountCents,
      createdAt: entry.createdAt,
    })),
  }
}
