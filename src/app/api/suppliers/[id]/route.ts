import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { supplierMutationSchema } from "@/lib/suppliers"
import {
  deleteSupplier,
  getSupplierFullDetail,
  updateSupplier,
} from "@/lib/suppliers-server"

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

    const supplier = await getSupplierFullDetail(params.id, storeContext.storeId)

    if (!supplier) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
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
    const payload = supplierMutationSchema.parse(body)
    const supplier = await updateSupplier(params.id, storeContext.storeId, payload)

    if (!supplier) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    await deleteSupplier(params.id, storeContext.storeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: 500 }
    )
  }
}
