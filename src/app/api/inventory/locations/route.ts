import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getInventoryApiErrorMessage,
  toInventoryLocationDto,
} from "@/lib/inventory-api"
import {
  createStockLocation,
  listStockLocations,
} from "@/lib/inventory-server"
import { stockLocationMutationSchema } from "@/lib/inventory"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && /(nome|local|loja|padrão|ativo)/i.test(error.message)) {
    return 400
  }

  return 500
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const locations = await listStockLocations(storeContext.storeId)

    return NextResponse.json({ data: locations.map(toInventoryLocationDto) })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: 500 }
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
    const payload = stockLocationMutationSchema.parse(body)
    const location = await createStockLocation(storeContext.storeId, payload)

    if (!location) {
      throw new Error("Não foi possível carregar o local criado.")
    }

    return NextResponse.json(
      { data: toInventoryLocationDto(location) },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
