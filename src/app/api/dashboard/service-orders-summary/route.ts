import { NextResponse } from "next/server"

import { getDashboardServiceOrdersSummary } from "@/lib/dashboard-server"
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
    const summary = await getDashboardServiceOrdersSummary(storeContext.storeId)

    return NextResponse.json({
      open: summary.open,
      waiting_approval: summary.waitingApproval,
      in_progress: summary.inProgress,
      ready_for_delivery: summary.readyForDelivery,
      total: summary.total,
    })
  } catch (error) {
    console.error("dashboard/service-orders-summary error", {
      route: "/api/dashboard/service-orders-summary",
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
