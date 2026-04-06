import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { customerMutationSchema } from "@/lib/customers"
import {
  getCustomerFullDetail,
  updateCustomer,
} from "@/lib/customers-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getValidationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const customer = await getCustomerFullDetail(params.id, storeContext.storeId)

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: customer })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: 500 }
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
    const payload = customerMutationSchema.parse(body)
    const customer = await updateCustomer(params.id, storeContext.storeId, payload)

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: customer })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
