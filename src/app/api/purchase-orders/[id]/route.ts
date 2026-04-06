import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  cancelPurchaseOrder,
  getPurchaseOrderFullDetail,
  updatePurchaseOrder,
} from "@/lib/purchase-orders-server"
import { purchaseOrderMutationSchema } from "@/lib/purchase-orders"

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

  return "Não foi possível processar o pedido de compra."
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(pedido|fornecedor|produto|receb)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const detail = await getPurchaseOrderFullDetail(params.id, storeContext.storeId)

    if (!detail) {
      return NextResponse.json({ error: "Pedido de compra não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: detail })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = purchaseOrderMutationSchema.parse(body)
    const detail = await updatePurchaseOrder(params.id, storeContext.storeId, payload)

    if (!detail) {
      return NextResponse.json({ error: "Pedido de compra não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: detail })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const detail = await cancelPurchaseOrder(params.id, storeContext.storeId)

    if (!detail) {
      return NextResponse.json({ error: "Pedido de compra não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: detail })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
