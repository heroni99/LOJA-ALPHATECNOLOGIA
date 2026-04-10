import { NextResponse } from "next/server"

import { getDashboardSalesByHour } from "@/lib/dashboard-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar as vendas por hora."
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const points = await getDashboardSalesByHour(storeContext.storeId)

    return NextResponse.json({
      data: points.map((point) => ({
        hour: point.hour,
        value: point.valueCents,
        count: point.count,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
