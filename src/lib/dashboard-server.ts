import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getCurrentCashSessionWithSummary } from "@/lib/cash-server"
import {
  type DashboardLowStockItem,
  type DashboardSalesByHourPoint,
  type DashboardServiceOrdersSummary,
  type DashboardTodaySnapshot,
  type DashboardTopProduct,
} from "@/lib/dashboard"
import { parseDbMoneyToCents } from "@/lib/products"
import { getStoreSnapshot } from "@/lib/stores-server"
import {
  getDayRangeUtc,
  getHourInTimeZone,
  getTodayDateStringInTimeZone,
} from "@/lib/store-time"

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

type ProductNameRecord = {
  id: string
  name: string
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

async function listCompletedSalesToday(storeId: string, timeZone: string) {
  const supabase = await createClient({ serviceRole: true })
  const today = getTodayDateStringInTimeZone(timeZone)
  const range = getDayRangeUtc(today, timeZone)
  const { data, error } = await supabase
    .from("sales")
    .select("id, total, completed_at, created_at")
    .eq("store_id", storeId)
    .eq("status", "COMPLETED")
    .gte("completed_at", range.start.toISOString())
    .lt("completed_at", range.end.toISOString())

  if (error) {
    throw error
  }

  return (data ?? []) as SaleSnapshotRecord[]
}

async function countCancelledSalesToday(storeId: string, timeZone: string) {
  const supabase = await createClient({ serviceRole: true })
  const today = getTodayDateStringInTimeZone(timeZone)
  const range = getDayRangeUtc(today, timeZone)
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "CANCELLED")
    .gte("created_at", range.start.toISOString())
    .lt("created_at", range.end.toISOString())

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function getDashboardTodaySnapshot(
  storeId: string,
  userId: string
): Promise<DashboardTodaySnapshot> {
  const store = await getStoreSnapshot(storeId)
  const timeZone = store.timezone

  const cashPayloadPromise = getCurrentCashSessionWithSummary(storeId, userId)
    .then((payload) => payload)
    .catch((error) => {
      console.error("dashboard/today cash status error:", error)

      return null
    })

  const [sales, cancelledCount, cashPayload] = await Promise.all([
    listCompletedSalesToday(storeId, timeZone),
    countCancelledSalesToday(storeId, timeZone),
    cashPayloadPromise,
  ])
  const totalValueCents = sales.reduce(
    (total, sale) => total + parseDbMoneyToCents(sale.total),
    0
  )
  const count = sales.length
  const cashStatus = cashPayload
    ? {
        open: cashPayload.session.status === "OPEN",
        terminalName: cashPayload.session.terminalName,
        operatorName: cashPayload.session.operatorName,
        openedAt: cashPayload.session.openedAt,
      }
    : {
        open: false,
        terminalName: null,
        operatorName: null,
        openedAt: null,
      }

  return {
    totalValueCents,
    count,
    averageTicketCents: count > 0 ? Math.round(totalValueCents / count) : 0,
    cancelledCount,
    cashStatus,
  }
}

export async function getDashboardSalesByHour(
  storeId: string
): Promise<DashboardSalesByHourPoint[]> {
  const store = await getStoreSnapshot(storeId)
  const timeZone = store.timezone
  const sales = await listCompletedSalesToday(storeId, timeZone)
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    valueCents: 0,
    count: 0,
  }))

  for (const sale of sales) {
    const referenceDate = sale.completed_at ?? sale.created_at
    const hour = getHourInTimeZone(referenceDate, timeZone)
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
  const store = await getStoreSnapshot(storeId)
  const timeZone = store.timezone
  const sales = await listCompletedSalesToday(storeId, timeZone)

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
    const current =
      aggregates.get(item.product_id) ??
      {
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
    .select("id, name")
    .eq("store_id", storeId)
    .in("id", productIds)

  if (productsError) {
    throw productsError
  }

  const productNameMap = new Map(
    ((products ?? []) as ProductNameRecord[]).map((product) => [product.id, product.name])
  )

  return Array.from(aggregates.values())
    .map((item) => ({
      productId: item.productId,
      name: productNameMap.get(item.productId) ?? "Produto removido",
      quantitySold: item.quantitySold,
      totalValueCents: item.totalValueCents,
    }))
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
      const effectiveMin = configuredMin > 0 ? configuredMin : normalizedThreshold

      return {
        id: product.id,
        name: product.name,
        internalCode: product.internal_code,
        currentStock,
        stockMin: effectiveMin,
      }
    })
    .filter((product) => product.currentStock <= product.stockMin)
    .sort((left, right) => {
      if (left.currentStock !== right.currentStock) {
        return left.currentStock - right.currentStock
      }

      return left.name.localeCompare(right.name, "pt-BR")
    })
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
        summary.ready += 1
      }

      return summary
    },
    {
      open: 0,
      waitingApproval: 0,
      inProgress: 0,
      ready: 0,
    }
  )
}
