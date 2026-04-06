import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  createProduct,
  getCurrentStoreContext,
  listProducts,
} from "@/lib/products-server"
import {
  getProductListFilters,
  productMutationSchema,
} from "@/lib/products"

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

    const filters = getProductListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listProducts(storeContext.storeId, filters)

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
    const payload = productMutationSchema.parse(body)
    const product = await createProduct(storeContext.storeId, payload)

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
