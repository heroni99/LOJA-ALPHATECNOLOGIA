import { NextRequest, NextResponse } from "next/server"

import { getDashboardLowStock } from "@/lib/dashboard-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar os alertas de estoque."
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const rawThreshold = Number.parseInt(
      request.nextUrl.searchParams.get("threshold") ?? "5",
      10
    )
    const items = await getDashboardLowStock(
      storeContext.storeId,
      Number.isFinite(rawThreshold) ? rawThreshold : 5
    )

    return NextResponse.json({
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        internal_code: item.internalCode,
        current_stock: item.currentStock,
        stock_min: item.stockMin,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
