import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import { getSalesReport } from "@/lib/reports-server"
import { parseSalesReportApiFilters } from "@/lib/reports"

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Filtros inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar o relatório de vendas."
}

function getErrorStatus(error: unknown) {
  return error instanceof ZodError ? 400 : 500
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = parseSalesReportApiFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const report = await getSalesReport(storeContext.storeId, filters)

    return NextResponse.json({
      data: report.items.map((item) => ({
        id: item.id,
        number: item.saleNumber,
        date: item.completedAt ?? item.createdAt,
        customer: item.customerName,
        operator: item.operatorName,
        total: item.totalCents,
        status: item.status,
        payment_methods: item.paymentMethods,
      })),
      meta: {
        total: report.totalCents,
        count: report.count,
        average_ticket: report.averageTicketCents,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
