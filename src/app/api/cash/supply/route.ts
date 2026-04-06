import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { cashSupplyMutationSchema } from "@/lib/cash"
import { createCashSupply } from "@/lib/cash-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getValidationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = cashSupplyMutationSchema.parse(body)
    const result = await createCashSupply(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
