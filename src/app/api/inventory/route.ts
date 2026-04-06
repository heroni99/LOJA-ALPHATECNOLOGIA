import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { getInventoryListFilters } from "@/lib/inventory"
import { listInventoryBalances } from "@/lib/inventory-server"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      )
    }

    const filters = getInventoryListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listInventoryBalances(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        lowStockCount: result.lowStockCount,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível listar os saldos de estoque.",
      },
      { status: 500 }
    )
  }
}
