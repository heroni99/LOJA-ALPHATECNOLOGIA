import { NextRequest, NextResponse } from "next/server"

import { getDashboardLowStock } from "@/lib/dashboard-server"
import {
  getRouteErrorDetails,
  getRouteErrorMessage,
  getRouteErrorStatus,
  getRouteStoreContext,
  type RouteStoreContext,
} from "@/lib/route-store-context"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let storeContext: RouteStoreContext | null = null

  try {
    storeContext = await getRouteStoreContext()

    const rawThreshold = Number.parseInt(
      request.nextUrl.searchParams.get("threshold") ?? "5",
      10
    )
    const items = await getDashboardLowStock(
      storeContext.storeId,
      Number.isFinite(rawThreshold) ? rawThreshold : 5
    )

    return NextResponse.json(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        internal_code: item.internalCode,
        current_stock: item.currentStock,
        stock_min: item.stockMin,
      }))
    )
  } catch (error) {
    console.error("dashboard/low-stock error", {
      route: "/api/dashboard/low-stock",
      userId: storeContext?.userId ?? null,
      storeId: storeContext?.storeId ?? null,
      error: getRouteErrorDetails(error),
    })

    return NextResponse.json(
      { error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    )
  }
}
