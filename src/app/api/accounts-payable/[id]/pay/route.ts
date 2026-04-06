import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { payAccountPayable } from "@/lib/financial-server"
import { accountSettlementMutationSchema } from "@/lib/financial"

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível liquidar a conta."
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(conta|valor|liquid)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = accountSettlementMutationSchema.parse(body)
    const accountId = await payAccountPayable(params.id, storeContext.storeId, payload)

    if (!accountId) {
      return NextResponse.json({ error: "Conta a pagar não encontrada." }, { status: 404 })
    }

    return NextResponse.json({ data: { id: accountId } })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
