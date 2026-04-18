import { NextResponse } from "next/server"

import {
  getCurrentCashSessionWithSummary,
  getOpenCashSessionWithSummary,
} from "@/lib/cash-server"
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
    const currentSession = await getOpenCashSessionWithSummary(storeContext.storeId)

    if (currentSession) {
      return NextResponse.json({
        data: currentSession.session,
        summary: currentSession.summary,
      })
    }

    const { session, summary } = await getCurrentCashSessionWithSummary(
      storeContext.storeId,
      storeContext.userId
    )

    return NextResponse.json({
      data: session,
      summary,
    })
  } catch (error) {
    console.error("cash/current-session error", {
      route: "/api/cash/current-session",
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
