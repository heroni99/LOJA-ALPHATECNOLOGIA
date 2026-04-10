import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getProductApiErrorMessage,
  toProductDetailDto,
  toProductSummaryDto,
} from "@/lib/products-api"
import {
  createProduct,
  getCurrentStoreContext,
  listProducts,
} from "@/lib/products-server"
import {
  getProductListFilters,
  productMutationSchema,
} from "@/lib/products"

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
      data: result.items.map(toProductSummaryDto),
      total: result.totalCount,
      page: result.page,
      limit: result.pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
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
    const created = await createProduct(storeContext.storeId, payload)

    if (!created) {
      throw new Error("Não foi possível carregar o produto criado.")
    }

    return NextResponse.json(
      {
        data: toProductDetailDto(created.product, {
          codes: created.codes,
          stockBalances: created.stockBalances,
          recentMovements: created.recentMovements,
        }),
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
