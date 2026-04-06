import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { receivePurchaseOrder } from "@/lib/purchase-orders-server"
import { purchaseOrderReceiveMutationSchema } from "@/lib/purchase-orders"

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

  return "Não foi possível registrar o recebimento."
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(receb|estoque|contas a pagar|produto|serial)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = purchaseOrderReceiveMutationSchema.parse(body)
    const result = await receivePurchaseOrder(
      params.id,
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    if (!result?.purchaseOrder) {
      return NextResponse.json({ error: "Pedido de compra não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      data: result.purchaseOrder,
      meta: {
        referenceId: result.referenceId,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
