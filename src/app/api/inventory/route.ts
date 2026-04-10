import { NextRequest, NextResponse } from "next/server"

import {
  getInventoryApiErrorMessage,
  toInventoryBalanceRowDto,
} from "@/lib/inventory-api"
import { getInventoryListFilters } from "@/lib/inventory"
import { listInventoryBalances } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getInventoryListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listInventoryBalances(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items.map(toInventoryBalanceRowDto),
      total: result.totalCount,
      page: result.page,
      limit: result.pageSize,
      low_stock_total: result.lowStockCount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
