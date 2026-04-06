import { NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { getFinancialSummary } from "@/lib/financial-server"

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const summary = await getFinancialSummary(storeContext.storeId)

    return NextResponse.json({ data: summary })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o resumo financeiro.",
      },
      { status: 500 }
    )
  }
}
