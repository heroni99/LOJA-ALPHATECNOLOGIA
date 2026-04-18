import { NextResponse } from "next/server"

import { getDashboardSalesLast7Days } from "@/lib/dashboard-server"
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
    const points = await getDashboardSalesLast7Days(storeContext.storeId)

    return NextResponse.json(
      points.map((point) => ({
        date: point.date,
        value: point.valueCents,
        count: point.count,
      }))
    )
  } catch (error) {
    console.error("dashboard/sales-last-7-days error", {
      route: "/api/dashboard/sales-last-7-days",
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
