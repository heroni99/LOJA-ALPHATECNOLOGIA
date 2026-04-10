import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { customerMutationSchema } from "@/lib/customers"
import { getCustomerApiErrorMessage, toCustomerDetailDto } from "@/lib/customers-api"
import {
  getCustomerFullDetail,
  softDeleteCustomer,
  updateCustomer,
} from "@/lib/customers-server"

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

    const detail = await getCustomerFullDetail(params.id, storeContext.storeId)

    if (!detail) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      data: toCustomerDetailDto(detail.customer, {
        sales: detail.sales,
        serviceOrders: detail.serviceOrders,
        receivables: detail.receivables,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getCustomerApiErrorMessage(error) },
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

    const detail = await getCustomerFullDetail(params.id, storeContext.storeId)

    return NextResponse.json({
      data: detail
        ? toCustomerDetailDto(detail.customer, {
            sales: detail.sales,
            serviceOrders: detail.serviceOrders,
            receivables: detail.receivables,
          })
        : toCustomerDetailDto(customer),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getCustomerApiErrorMessage(error) },
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

    const deleted = await softDeleteCustomer(params.id, storeContext.storeId)

    if (!deleted) {
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
