import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { createSaleReturn } from "@/lib/sale-returns-server"
import { saleReturnMutationSchema } from "@/lib/sale-returns"

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a devolução."
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(devolu|venda|caixa|estoque|item)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = saleReturnMutationSchema.parse(body)
    const saleReturnId = await createSaleReturn(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json(
      {
        data: {
          id: saleReturnId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
