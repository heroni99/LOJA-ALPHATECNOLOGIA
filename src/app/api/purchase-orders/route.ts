import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/purchase-orders-server"
import {
  getPurchaseOrderListFilters,
  purchaseOrderMutationSchema,
} from "@/lib/purchase-orders"

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

  if (
    error instanceof Error &&
    /(fornecedor|produto|pedido|compra|quantidade|custo|loja)/i.test(error.message)
  ) {
    return 400
  }

  return 500
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getPurchaseOrderListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listPurchaseOrders(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = purchaseOrderMutationSchema.parse(body)
    const purchaseOrder = await createPurchaseOrder(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json({ data: purchaseOrder }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
