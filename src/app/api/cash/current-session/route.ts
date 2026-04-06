import { NextResponse } from "next/server"

import { getOrCreateCurrentCashSession } from "@/lib/cash-server"
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

    const session = await getOrCreateCurrentCashSession(
      storeContext.storeId,
      storeContext.userId
    )

    return NextResponse.json({ data: session })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: 500 }
    )
  }
}
