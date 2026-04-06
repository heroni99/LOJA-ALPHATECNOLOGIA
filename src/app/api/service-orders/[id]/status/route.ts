import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  changeServiceOrderStatus,
} from "@/lib/service-orders-server"
import { serviceOrderStatusChangeSchema } from "@/lib/service-orders"

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /(status|ordem de serviço|os|aprov|entrega|cancel|rejeit)/i.test(error.message)
  ) {
    return 400
  }

  return 500
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível atualizar o status da OS."
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = serviceOrderStatusChangeSchema.parse(body)
    const detail = await changeServiceOrderStatus(
      params.id,
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    if (!detail) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada." },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: detail })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
