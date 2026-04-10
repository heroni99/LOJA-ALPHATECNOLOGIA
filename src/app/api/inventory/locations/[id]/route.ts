import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getInventoryApiErrorMessage,
  toInventoryLocationDto,
} from "@/lib/inventory-api"
import { stockLocationMutationSchema } from "@/lib/inventory"
import { updateStockLocation } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(nome|local|loja|padrão|ativo)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = stockLocationMutationSchema.parse(body)
    const location = await updateStockLocation(
      params.id,
      storeContext.storeId,
      payload
    )

    if (!location) {
      return NextResponse.json({ error: "Local não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: toInventoryLocationDto(location) })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
