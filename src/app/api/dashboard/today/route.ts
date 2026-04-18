import { NextResponse } from "next/server"

import { getDashboardTodaySnapshot } from "@/lib/dashboard-server"
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

    const snapshot = await getDashboardTodaySnapshot(
      storeContext.storeId,
      storeContext.userId
    )

    return NextResponse.json({
      data: {
        total_value: snapshot.totalValueCents,
        count: snapshot.count,
        average_ticket: snapshot.averageTicketCents,
        cancelled_count: snapshot.cancelledCount,
        cash_status: {
          open: snapshot.cashStatus.open,
          terminal_name: snapshot.cashStatus.terminalName,
          operator_name: snapshot.cashStatus.operatorName,
          opened_at: snapshot.cashStatus.openedAt,
        },
      },
    })
  } catch (error) {
    console.error("dashboard/today error", {
      route: "/api/dashboard/today",
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
