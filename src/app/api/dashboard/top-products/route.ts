import { NextRequest, NextResponse } from "next/server"

import { getDashboardTopProducts } from "@/lib/dashboard-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar os produtos do dashboard."
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const rawLimit = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "5",
      10
    )
    const items = await getDashboardTopProducts(
      storeContext.storeId,
      Number.isFinite(rawLimit) ? rawLimit : 5
    )

    return NextResponse.json({
      data: items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        quantity_sold: item.quantitySold,
        total_value: item.totalValueCents,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
