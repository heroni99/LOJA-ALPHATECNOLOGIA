import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

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

  if (
    error instanceof Error &&
    /(nome|local|loja|padrão)/i.test(error.message)
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

  return "Não foi possível processar o local de estoque."
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      )
    }

    const locations = await listStockLocations(storeContext.storeId)

    return NextResponse.json({ data: locations })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const payload = stockLocationMutationSchema.parse(body)
    const location = await createStockLocation(storeContext.storeId, payload)

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
