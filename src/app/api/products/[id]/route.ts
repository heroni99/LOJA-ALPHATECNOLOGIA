import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getProductApiErrorMessage,
  toProductDetailDto,
} from "@/lib/products-api"
import {
  getCurrentStoreContext,
  getProductFullDetail,
  softDeleteProduct,
  updateProduct,
} from "@/lib/products-server"
import { productMutationSchema } from "@/lib/products"

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

    const detail = await getProductFullDetail(params.id, storeContext.storeId)

    if (!detail) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      data: toProductDetailDto(detail.product, {
        codes: detail.codes,
        stockBalances: detail.stockBalances,
        recentMovements: detail.recentMovements,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
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
    const payload = productMutationSchema.parse(body)
    const detail = await updateProduct(params.id, storeContext.storeId, payload)

    if (!detail) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      data: toProductDetailDto(detail.product, {
        codes: detail.codes,
        stockBalances: detail.stockBalances,
        recentMovements: detail.recentMovements,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
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

    const deleted = await softDeleteProduct(params.id, storeContext.storeId)

    if (!deleted) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
