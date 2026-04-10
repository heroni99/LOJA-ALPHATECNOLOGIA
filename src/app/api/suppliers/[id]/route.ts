import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { supplierMutationSchema } from "@/lib/suppliers"
import { getSupplierApiErrorMessage, toSupplierDetailDto } from "@/lib/suppliers-api"
import {
  getSupplierFullDetail,
  softDeleteSupplier,
  updateSupplier,
} from "@/lib/suppliers-server"

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

    const detail = await getSupplierFullDetail(params.id, storeContext.storeId)

    if (!detail) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      data: toSupplierDetailDto(detail.supplier, {
        products: detail.products,
        purchaseOrders: detail.purchaseOrders,
        payables: detail.payables,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getSupplierApiErrorMessage(error) },
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

    const detail = await getSupplierFullDetail(params.id, storeContext.storeId)

    return NextResponse.json({
      data: detail
        ? toSupplierDetailDto(detail.supplier, {
            products: detail.products,
            purchaseOrders: detail.purchaseOrders,
            payables: detail.payables,
          })
        : toSupplierDetailDto(supplier),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getSupplierApiErrorMessage(error) },
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

    const deleted = await softDeleteSupplier(params.id, storeContext.storeId)

    if (!deleted) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getSupplierApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
