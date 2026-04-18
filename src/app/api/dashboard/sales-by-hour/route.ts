import { NextResponse } from "next/server"

import { getDashboardSalesByHour } from "@/lib/dashboard-server"
import {
  getRouteErrorDetails,
  getRouteErrorMessage,
  getRouteErrorStatus,
  getRouteStoreContext,
  type RouteStoreContext,
} from "@/lib/route-store-context"

export const dynamic = "force-dynamic"

export async function GET() {
  let storeContext: RouteStoreContext | null = null

  try {
    storeContext = await getRouteStoreContext()
    const points = await getDashboardSalesByHour(storeContext.storeId)

    return NextResponse.json(
      points.map((point) => ({
        hour: point.hour,
        value: point.valueCents,
        count: point.count,
      }))
    )
  } catch (error) {
    console.error("dashboard/sales-by-hour error", {
      route: "/api/dashboard/sales-by-hour",
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
