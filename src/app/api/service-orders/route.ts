import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  createServiceOrder,
  listServiceOrders,
} from "@/lib/service-orders-server"
import {
  getServiceOrderListFilters,
  serviceOrderCreateSchema,
} from "@/lib/service-orders"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /(cliente|técnico|loja|aparelho|problema|ordem de serviço|os)/i.test(error.message)
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

  return "Não foi possível processar a requisição."
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getServiceOrderListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listServiceOrders(storeContext.storeId, filters)

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
    const payload = serviceOrderCreateSchema.parse(body)
    const serviceOrder = await createServiceOrder(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json({ data: serviceOrder }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
