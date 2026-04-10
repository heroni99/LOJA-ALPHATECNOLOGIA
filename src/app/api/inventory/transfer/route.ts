import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getInventoryApiErrorMessage,
  toInventoryStockBalanceDto,
} from "@/lib/inventory-api"
import { inventoryTransferMutationSchema } from "@/lib/inventory"
import {
  createInventoryTransfer,
  getStockBalanceByProductAndLocation,
} from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /(quantidade|produto|local|origem|destino|estoque|transfer|ativo)/i.test(error.message)
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
    const payload = inventoryTransferMutationSchema.parse(body)
    const referenceId = await createInventoryTransfer(
      storeContext.storeId,
      storeContext.userId,
      payload
    )
    const [fromBalance, toBalance] = await Promise.all([
      getStockBalanceByProductAndLocation(
        storeContext.storeId,
        payload.product_id,
        payload.from_location_id
      ),
      getStockBalanceByProductAndLocation(
        storeContext.storeId,
        payload.product_id,
        payload.to_location_id
      ),
    ])

    if (!fromBalance || !toBalance) {
      throw new Error("Não foi possível carregar os saldos atualizados.")
    }

    return NextResponse.json({
      reference_id: referenceId,
      data: {
        from_balance: toInventoryStockBalanceDto(fromBalance),
        to_balance: toInventoryStockBalanceDto(toBalance),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getInventoryApiErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
