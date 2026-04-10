import "server-only"

import { createClient } from "@/lib/supabase/server"
import { parseDbMoneyToCents } from "@/lib/products"
import {
  type SalesReportFilters,
  type SalesReportResult,
  type SalesReportRow,
  type StockReportFilters,
  type StockReportResult,
  type StockReportRow,
} from "@/lib/reports"
import { getStoreSnapshot } from "@/lib/stores-server"
import { getDateRangeUtc } from "@/lib/store-time"

type SalesReportRecord = {
  id: string
  customer_id: string | null
  user_id: string
  sale_number: string
  total: number | string | null
  status: SalesReportRow["status"]
  completed_at: string | null
  created_at: string
}

type SalePaymentRecord = {
  sale_id: string
  method: string
  created_at: string
}

type CustomerRecord = {
  id: string
  name: string
}

type ProfileRecord = {
  id: string
  name: string | null
}

type StockProductRecord = {
  id: string
  internal_code: string
  name: string
  cost_price: number | string | null
  sale_price: number | string | null
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

async function listCustomersByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, CustomerRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("store_id", storeId)
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

function mapStockRow(record: StockProductRecord): StockReportRow {
  const category = getSingleRelation(record.categories)
  const locationBalances = (record.stock_balances ?? []).map((balance) => {
    const location = getSingleRelation(balance.stock_locations)

    return {
      locationId: balance.location_id,
      locationName: location?.name ?? null,
      quantity: parseQuantity(balance.quantity),
    }
  })
  const totalQuantity = locationBalances.reduce(
    (total, balance) => total + balance.quantity,
    0
  )
  const stockMin = parseQuantity(record.stock_min)

  return {
    id: record.id,
    internalCode: record.internal_code,
    name: record.name,
    categoryName: category?.name ?? null,
    totalQuantity,
    stockMin,
    costPriceCents: parseDbMoneyToCents(record.cost_price),
    salePriceCents: parseDbMoneyToCents(record.sale_price),
    isBelowMin: stockMin > 0 && totalQuantity <= stockMin,
    locationBalances,
  }
}

export async function getSalesReport(
  storeId: string,
  filters: SalesReportFilters
): Promise<SalesReportResult> {
  const store = await getStoreSnapshot(storeId)
  const timeZone = store.timezone
  const supabase = await createClient({ serviceRole: true })
  const dateRange = getDateRangeUtc(filters.start, filters.end, timeZone)
  const matchingCustomerIds = filters.search
    ? await searchCustomerIds(storeId, filters.search)
    : []
  let query = supabase
    .from("sales")
    .select(
      "id, customer_id, user_id, sale_number, total, status, completed_at, created_at"
    )
    .eq("store_id", storeId)
    .gte("created_at", dateRange.start.toISOString())
    .lt("created_at", dateRange.end.toISOString())
    .order("created_at", { ascending: false })

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

  const { data, error } = await query

  if (error) {
    throw error
  }

  const records = (data ?? []) as SalesReportRecord[]
  const customerIds = Array.from(
    new Set(
      records
        .map((record) => record.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const userIds = Array.from(new Set(records.map((record) => record.user_id)))
  const saleIds = records.map((record) => record.id)
  const [customers, profiles, paymentsResult] = await Promise.all([
    listCustomersByIds(storeId, customerIds),
    listProfilesByIds(userIds),
    saleIds.length > 0
      ? supabase
          .from("sale_payments")
          .select("sale_id, method, created_at")
          .in("sale_id", saleIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (paymentsResult.error) {
    throw paymentsResult.error
  }

  const paymentMap = new Map<string, string[]>()

  for (const payment of (paymentsResult.data ?? []) as SalePaymentRecord[]) {
    const current = paymentMap.get(payment.sale_id) ?? []

    current.push(payment.method)
    paymentMap.set(payment.sale_id, current)
  }

  const items: SalesReportRow[] = records.map((record) => ({
    id: record.id,
    saleNumber: record.sale_number,
    customerName: record.customer_id
      ? customers.get(record.customer_id)?.name ?? null
      : null,
    operatorName: profiles.get(record.user_id)?.name ?? null,
    totalCents: parseDbMoneyToCents(record.total),
    status: record.status,
    completedAt: record.completed_at,
    createdAt: record.created_at,
    paymentMethods: paymentMap.get(record.id) ?? [],
  }))
  const totalCents = items.reduce((total, item) => total + item.totalCents, 0)
  const count = items.length

  return {
    items,
    totalCents,
    count,
    averageTicketCents: count > 0 ? Math.round(totalCents / count) : 0,
    filters,
  }
}

export async function getStockReport(
  storeId: string,
  filters: StockReportFilters
): Promise<StockReportResult> {
  const supabase = await createClient({ serviceRole: true })
  let query = supabase
    .from("products")
    .select(
      "id, internal_code, name, cost_price, sale_price, stock_min, categories(id, name), stock_balances(quantity, location_id, stock_locations(id, name))"
    )
    .eq("store_id", storeId)
    .eq("is_service", false)
    .order("name", { ascending: true })

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  if (filters.search) {
    const sanitized = filters.search.replace(/[(),]/g, " ").trim()

    query = query.or(`name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const items = ((data ?? []) as StockProductRecord[])
    .map(mapStockRow)
    .map((item) => {
      if (!filters.locationId) {
        return item
      }

      const locationBalance = item.locationBalances.find(
        (balance) => balance.locationId === filters.locationId
      )

      return {
        ...item,
        totalQuantity: locationBalance?.quantity ?? 0,
        locationBalances: item.locationBalances.filter(
          (balance) => balance.locationId === filters.locationId
        ),
      }
    })
    .map((item) => ({
      ...item,
      isBelowMin: item.stockMin > 0 && item.totalQuantity <= item.stockMin,
    }))
    .filter((item) => (filters.lowStock ? item.isBelowMin : true))

  return {
    items,
    filters,
  }
}
