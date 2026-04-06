import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { inventoryTransferMutationSchema } from "@/lib/inventory"
import { createInventoryTransfer } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /(quantidade|produto|local|origem|destino|estoque|transfer)/i.test(error.message)
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

  return "Não foi possível registrar a transferência de estoque."
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
    const payload = inventoryTransferMutationSchema.parse(body)
    const referenceId = await createInventoryTransfer(
      storeContext.storeId,
      storeContext.userId,
      payload
    )

    return NextResponse.json({
      data: {
        referenceId,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
