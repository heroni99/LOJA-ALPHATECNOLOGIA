import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { supplierMutationSchema, getSupplierListFilters } from "@/lib/suppliers"
import { createSupplier, listSuppliers } from "@/lib/suppliers-server"

function getValidationMessage(error: unknown) {
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

    const filters = getSupplierListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listSuppliers(storeContext.storeId, filters)

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
      { error: getValidationMessage(error) },
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
    const payload = supplierMutationSchema.parse(body)
    const supplier = await createSupplier(storeContext.storeId, payload)

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
