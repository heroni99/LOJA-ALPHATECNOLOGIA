import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { getStockReport } from "@/lib/reports-server"
import { getStockReportFilters } from "@/lib/reports"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar o relatório de estoque."
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getStockReportFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const report = await getStockReport(storeContext.storeId, filters)

    return NextResponse.json({
      data: report.items.map((item) => ({
        id: item.id,
        internal_code: item.internalCode,
        name: item.name,
        category: item.categoryName,
        stock_total: item.totalQuantity,
        stock_min: item.stockMin,
        cost: item.costPriceCents,
        price: item.salePriceCents,
        low_stock: item.isBelowMin,
        location_balances: item.locationBalances.map((balance) => ({
          location_id: balance.locationId,
          location_name: balance.locationName,
          quantity: balance.quantity,
        })),
      })),
      meta: {
        totalCount: report.items.length,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
