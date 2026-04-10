import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  getCustomerApiErrorMessage,
  toCustomerDetailDto,
  toCustomerSummaryDto,
} from "@/lib/customers-api"
import { customerMutationSchema, getCustomerListFilters } from "@/lib/customers"
import { createCustomer, getCustomerFullDetail, listCustomers } from "@/lib/customers-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getCustomerListFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const result = await listCustomers(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items.map(toCustomerSummaryDto),
      total: result.totalCount,
      page: result.page,
      limit: result.pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getCustomerApiErrorMessage(error) },
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
    const payload = customerMutationSchema.parse(body)
    const created = await createCustomer(storeContext.storeId, payload)

    if (!created) {
      throw new Error("Não foi possível carregar o cliente criado.")
    }

    const detail = await getCustomerFullDetail(created.id, storeContext.storeId)

    return NextResponse.json(
      {
        data: detail
          ? toCustomerDetailDto(detail.customer, {
              sales: detail.sales,
              serviceOrders: detail.serviceOrders,
              receivables: detail.receivables,
            })
          : toCustomerDetailDto(created),
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getCustomerApiErrorMessage(error) },
      { status: error instanceof ZodError ? 400 : 500 }
    )
  }
}
