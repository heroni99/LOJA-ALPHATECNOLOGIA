import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { toPdvCompletedSaleDto } from "@/lib/pdv-api"
import { pdvCheckoutSchema } from "@/lib/pdv"
import { checkoutPdvSale } from "@/lib/pdv-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getValidationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível concluir a venda."
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /caixa|pagamento|estoque|produto|cliente|serial|desconto|venda|local/i.test(
      error.message
    )
  ) {
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
    const payload = pdvCheckoutSchema.parse(body)
    const sale = await checkoutPdvSale(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json({ data: toPdvCompletedSaleDto(sale) }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
