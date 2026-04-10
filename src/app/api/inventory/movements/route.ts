import { NextRequest, NextResponse } from "next/server"

import {
  getInventoryApiErrorMessage,
  toInventoryMovementDto,
} from "@/lib/inventory-api"
import { getInventoryMovementsFilters } from "@/lib/inventory"
import { listInventoryMovements } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getInventoryMovementsFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listInventoryMovements(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items.map(toInventoryMovementDto),
      total: result.totalCount,
      page: result.page,
      limit: result.pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
