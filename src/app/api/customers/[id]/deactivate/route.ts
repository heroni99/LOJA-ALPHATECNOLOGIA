import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { getCustomerApiErrorMessage } from "@/lib/customers-api"
import { softDeleteCustomer } from "@/lib/customers-server"

type RouteContext = {
  params: {
    id: string
  }
}

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const deactivated = await softDeleteCustomer(params.id, storeContext.storeId)

    if (!deactivated) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getCustomerApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
