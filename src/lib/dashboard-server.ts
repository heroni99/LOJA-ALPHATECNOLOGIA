import "server-only"

import { getOpenCashSessionWithSummary } from "@/lib/cash-server"
import {
  type DashboardLowStockItem,
  type DashboardSalesByHourPoint,
  type DashboardSalesLast7DaysPoint,
  type DashboardServiceOrdersSummary,
  type DashboardTodaySnapshot,
  type DashboardTopProduct,
} from "@/lib/dashboard"
import { parseDbMoneyToCents } from "@/lib/products"
import {
  DEFAULT_STORE_TIMEZONE,
  getDateRangeUtc,
  getDateStringInTimeZone,
  getDayRangeUtc,
  getHourInTimeZone,
  getTodayDateStringInTimeZone,
} from "@/lib/store-time"
import { createClient } from "@/lib/supabase/server"

const DASHBOARD_TIME_ZONE = DEFAULT_STORE_TIMEZONE

type SaleSnapshotRecord = {
  id: string
  total: number | string | null
  completed_at: string | null
  created_at: string
}

type SaleItemSnapshotRecord = {
  product_id: string
  quantity: number | string | null
  total_price: number | string | null
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
}

type LowStockProductRecord = {
  id: string
  name: string
  internal_code: string
  stock_min: number | string | null
  stock_balances?: { quantity: number | string | null }[] | null
}

type ServiceOrderStatusRecord = {
  status: string
}

function parseQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function shiftDateString(value: string, days: number) {
  const [year, month, day] = value.split("-").map((item) => Number(item))
  const nextDate = new Date(Date.UTC(year, month - 1, day))

  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  const paddedMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0")
  const paddedDay = String(nextDate.getUTCDate()).padStart(2, "0")

  return `${nextDate.getUTCFullYear()}-${paddedMonth}-${paddedDay}`
}

function formatDashboardDateLabel(dateString: string) {
  const [, month, day] = dateString.split("-")

  return `${day}/${month}`
}

function getTodayRange() {
  const today = getTodayDateStringInTimeZone(DASHBOARD_TIME_ZONE)

  return {
    today,
    ...getDayRangeUtc(today, DASHBOARD_TIME_ZONE),
  }
}

async function listCompletedSalesToday(storeId: string) {
  const { start, end } = getTodayRange()
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select("id, total, completed_at, created_at")
    .eq("store_id", storeId)
    .eq("status", "COMPLETED")
    .gte("completed_at", start.toISOString())
    .lt("completed_at", end.toISOString())

  if (error) {
    throw error
  }

  return (data ?? []) as SaleSnapshotRecord[]
}

async function listCompletedSalesLast7Days(storeId: string) {
  const today = getTodayDateStringInTimeZone(DASHBOARD_TIME_ZONE)
  const startDate = shiftDateString(today, -6)
  const dateRange = getDateRangeUtc(startDate, today, DASHBOARD_TIME_ZONE)
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select("id, total, completed_at, created_at")
    .eq("store_id", storeId)
    .eq("status", "COMPLETED")
    .gte("completed_at", dateRange.start.toISOString())
    .lt("completed_at", dateRange.end.toISOString())

  if (error) {
    throw error
  }

  return (data ?? []) as SaleSnapshotRecord[]
}

async function countCancelledSalesToday(storeId: string) {
  const { start, end } = getTodayRange()
  const supabase = await createClient({ serviceRole: true })
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "CANCELLED")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function getDashboardTodaySnapshot(
  storeId: string
): Promise<DashboardTodaySnapshot> {
  const cashPayloadPromise = getOpenCashSessionWithSummary(storeId)
    .then((payload) => payload)
    .catch((error) => {
      console.error("dashboard/today cash status error:", error)

      return null
    })

  const [sales, cancelledCount, cashPayload] = await Promise.all([
    listCompletedSalesToday(storeId),
    countCancelledSalesToday(storeId),
    cashPayloadPromise,
  ])

  const totalValueCents = sales.reduce(
    (total, sale) => total + parseDbMoneyToCents(sale.total),
    0
  )
  const totalCount = sales.length

  return {
    totalValueCents,
    totalCount,
    averageTicketCents:
      totalCount > 0 ? Math.round(totalValueCents / totalCount) : 0,
    cancelledCount,
    cashSessionOpen: cashPayload?.session.status === "OPEN",
  }
}

export async function getDashboardSalesByHour(
  storeId: string
): Promise<DashboardSalesByHourPoint[]> {
  const sales = await listCompletedSalesToday(storeId)
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    valueCents: 0,
    count: 0,
  }))

  for (const sale of sales) {
    const referenceDate = sale.completed_at ?? sale.created_at
    const hour = getHourInTimeZone(referenceDate, DASHBOARD_TIME_ZONE)
    const bucket = buckets[hour]

    bucket.valueCents += parseDbMoneyToCents(sale.total)
    bucket.count += 1
  }

  return buckets
}

export async function getDashboardTopProducts(
  storeId: string,
  limit = 5
): Promise<DashboardTopProduct[]> {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 20)
    : 5
  const sales = await listCompletedSalesToday(storeId)

  if (sales.length === 0) {
    return []
  }

  const supabase = await createClient({ serviceRole: true })
  const saleIds = sales.map((sale) => sale.id)
  const { data: itemData, error: itemError } = await supabase
    .from("sale_items")
    .select("product_id, quantity, total_price")
    .in("sale_id", saleIds)

  if (itemError) {
    throw itemError
  }

  const aggregates = new Map<
    string,
    { productId: string; quantitySold: number; totalValueCents: number }
  >()

  for (const item of (itemData ?? []) as SaleItemSnapshotRecord[]) {
    const current = aggregates.get(item.product_id) ?? {
      productId: item.product_id,
      quantitySold: 0,
      totalValueCents: 0,
    }

    current.quantitySold += parseQuantity(item.quantity)
    current.totalValueCents += parseDbMoneyToCents(item.total_price)
    aggregates.set(item.product_id, current)
  }

  const productIds = Array.from(aggregates.keys())
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, internal_code")
    .eq("store_id", storeId)
    .in("id", productIds)

  if (productsError) {
    throw productsError
  }

  const productMap = new Map(
    ((products ?? []) as ProductRecord[]).map((product) => [product.id, product])
  )

  return Array.from(aggregates.values())
    .map((item) => {
      const product = productMap.get(item.productId)

      return {
        productId: item.productId,
        name: product?.name ?? "Produto removido",
        internalCode: product?.internal_code ?? "SEM-CODIGO",
        quantitySold: item.quantitySold,
        totalValueCents: item.totalValueCents,
      }
    })
    .sort((left, right) => {
      if (right.quantitySold !== left.quantitySold) {
        return right.quantitySold - left.quantitySold
      }

      return right.totalValueCents - left.totalValueCents
    })
    .slice(0, normalizedLimit)
}

export async function getDashboardLowStock(
  storeId: string,
  threshold = 5
): Promise<DashboardLowStockItem[]> {
  const normalizedThreshold = Number.isFinite(threshold)
    ? Math.max(Math.floor(threshold), 0)
    : 5
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, stock_min, stock_balances(quantity)")
    .eq("store_id", storeId)
    .eq("is_service", false)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as LowStockProductRecord[])
    .map((product) => {
      const currentStock = (product.stock_balances ?? []).reduce(
        (total, balance) => total + parseQuantity(balance.quantity),
        0
      )
      const configuredMin = parseQuantity(product.stock_min)
      const effectiveMin =
        configuredMin > 0 ? configuredMin : normalizedThreshold

      return {
        id: product.id,
        name: product.name,
        internalCode: product.internal_code,
        currentStock,
        stockMin: configuredMin,
        effectiveMin,
      }
    })
    .filter((product) => product.currentStock <= product.effectiveMin)
    .sort((left, right) => {
      if (left.currentStock !== right.currentStock) {
        return left.currentStock - right.currentStock
      }

      return left.name.localeCompare(right.name, "pt-BR")
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      internalCode: product.internalCode,
      currentStock: product.currentStock,
      stockMin: product.stockMin,
    }))
}

export async function getDashboardServiceOrdersSummary(
  storeId: string
): Promise<DashboardServiceOrdersSummary> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("service_orders")
    .select("status")
    .eq("store_id", storeId)
    .in("status", ["OPEN", "WAITING_APPROVAL", "IN_PROGRESS", "READY_FOR_DELIVERY"])

  if (error) {
    throw error
  }

  return ((data ?? []) as ServiceOrderStatusRecord[]).reduce<DashboardServiceOrdersSummary>(
    (summary, item) => {
      if (item.status === "OPEN") {
        summary.open += 1
      } else if (item.status === "WAITING_APPROVAL") {
        summary.waitingApproval += 1
      } else if (item.status === "IN_PROGRESS") {
        summary.inProgress += 1
      } else if (item.status === "READY_FOR_DELIVERY") {
        summary.readyForDelivery += 1
      }

      summary.total += 1

      return summary
    },
    {
      open: 0,
      waitingApproval: 0,
      inProgress: 0,
      readyForDelivery: 0,
      total: 0,
    }
  )
}

export async function getDashboardSalesLast7Days(
  storeId: string
): Promise<DashboardSalesLast7DaysPoint[]> {
  const today = getTodayDateStringInTimeZone(DASHBOARD_TIME_ZONE)
  const dateStrings = Array.from({ length: 7 }, (_, index) =>
    shiftDateString(today, index - 6)
  )
  const buckets = new Map(
    dateStrings.map((dateString) => [
      dateString,
      {
        date: formatDashboardDateLabel(dateString),
        valueCents: 0,
        count: 0,
      },
    ])
  )
  const sales = await listCompletedSalesLast7Days(storeId)

  for (const sale of sales) {
    const referenceDate = sale.completed_at ?? sale.created_at
    const dateKey = getDateStringInTimeZone(
      new Date(referenceDate),
      DASHBOARD_TIME_ZONE
    )
    const bucket = buckets.get(dateKey)

    if (!bucket) {
      continue
    }

    bucket.valueCents += parseDbMoneyToCents(sale.total)
    bucket.count += 1
  }

  return dateStrings.map((dateString) => {
    const bucket = buckets.get(dateString)

    return {
      date: bucket?.date ?? formatDashboardDateLabel(dateString),
      valueCents: bucket?.valueCents ?? 0,
      count: bucket?.count ?? 0,
    }
  })
}
