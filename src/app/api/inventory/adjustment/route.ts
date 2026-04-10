import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getInventoryApiErrorMessage,
  toInventoryStockBalanceDto,
} from "@/lib/inventory-api"
import { inventoryAdjustmentMutationSchema } from "@/lib/inventory"
import {
  createInventoryAdjustment,
  getStockBalanceByProductAndLocation,
} from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /(quantidade|motivo|produto|local|loja|estoque|ajuste|ativo)/i.test(error.message)
  ) {
    return 400
  }

  return 500
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = inventoryAdjustmentMutationSchema.parse(body)
    const previousBalance = await getStockBalanceByProductAndLocation(
      storeContext.storeId,
      payload.product_id,
      payload.location_id
    )
    const referenceId = await createInventoryAdjustment(
      storeContext.storeId,
      storeContext.userId,
      payload
    )
    const balance = await getStockBalanceByProductAndLocation(
      storeContext.storeId,
      payload.product_id,
      payload.location_id
    )

    if (!balance) {
      throw new Error("Não foi possível carregar o saldo atualizado.")
    }

    return NextResponse.json({
      reference_id: referenceId,
      difference: payload.new_quantity - (previousBalance?.quantity ?? 0),
      data: toInventoryStockBalanceDto(balance),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
