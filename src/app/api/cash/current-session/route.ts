import { NextResponse } from "next/server"

import { getCurrentCashSessionWithSummary } from "@/lib/cash-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getValidationMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const { session, summary } = await getCurrentCashSessionWithSummary(
      storeContext.storeId,
      storeContext.userId
    )

    return NextResponse.json({
      data: session,
      summary,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: 500 }
    )
  }
}
