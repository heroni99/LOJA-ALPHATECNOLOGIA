import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { supplierMutationSchema, getSupplierListFilters } from "@/lib/suppliers"
import { getSupplierApiErrorMessage, toSupplierDetailDto, toSupplierSummaryDto } from "@/lib/suppliers-api"
import { createSupplier, getSupplierFullDetail, listSuppliers } from "@/lib/suppliers-server"

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
      data: result.items.map(toSupplierSummaryDto),
      total: result.totalCount,
      page: result.page,
      limit: result.pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getSupplierApiErrorMessage(error) },
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
    const created = await createSupplier(storeContext.storeId, payload)

    if (!created) {
      throw new Error("Não foi possível carregar o fornecedor criado.")
    }

    const detail = await getSupplierFullDetail(created.id, storeContext.storeId)

    return NextResponse.json(
      {
        data: detail
          ? toSupplierDetailDto(detail.supplier, {
              products: detail.products,
              purchaseOrders: detail.purchaseOrders,
              payables: detail.payables,
            })
          : toSupplierDetailDto(created),
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getSupplierApiErrorMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
