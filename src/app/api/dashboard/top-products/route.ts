import { NextRequest, NextResponse } from "next/server"

import { getDashboardTopProducts } from "@/lib/dashboard-server"
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

    const rawLimit = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "5",
      10
    )
    const items = await getDashboardTopProducts(
      storeContext.storeId,
      Number.isFinite(rawLimit) ? rawLimit : 5
    )

    return NextResponse.json(
      items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        internal_code: item.internalCode,
        quantity_sold: item.quantitySold,
        total_value: item.totalValueCents,
      }))
    )
  } catch (error) {
    console.error("dashboard/top-products error", {
      route: "/api/dashboard/top-products",
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
