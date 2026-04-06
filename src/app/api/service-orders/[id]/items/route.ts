import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { addServiceOrderItem } from "@/lib/service-orders-server"
import { serviceOrderItemMutationSchema } from "@/lib/service-orders"

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
    /(estoque|peça|produto|serializada|local|ordem de serviço|os)/i.test(error.message)
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

  return "Não foi possível adicionar a peça à OS."
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = serviceOrderItemMutationSchema.parse(body)
    const detail = await addServiceOrderItem(
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
