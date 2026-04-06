import { NextRequest, NextResponse } from "next/server"

import { getInventoryMovementsFilters } from "@/lib/inventory"
import { listInventoryMovements } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      )
    }

    const filters = getInventoryMovementsFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listInventoryMovements(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível listar as movimentações.",
      },
      { status: 500 }
    )
  }
}
