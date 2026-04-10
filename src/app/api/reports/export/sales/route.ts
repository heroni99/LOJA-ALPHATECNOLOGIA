import { NextRequest } from "next/server"
import { ZodError } from "zod"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  buildCsv,
  formatPaymentMethodsForCsv,
  formatReportMoney,
  formatSaleStatusForCsv,
  parseSalesReportApiFilters,
} from "@/lib/reports"
import { getSalesReport } from "@/lib/reports-server"
import { formatDateTimeInTimeZone, getTodayDateStringInTimeZone } from "@/lib/store-time"

function getErrorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return getErrorResponse("Usuário não autenticado.", 401)
    }

    const filters = parseSalesReportApiFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const report = await getSalesReport(storeContext.storeId, filters)
    const csv = buildCsv([
      ["Número", "Data", "Cliente", "Operador", "Total", "Status", "Forma pagamento"],
      ...report.items.map((item) => [
        item.saleNumber,
        formatDateTimeInTimeZone(item.completedAt ?? item.createdAt),
        item.customerName ?? "Consumidor final",
        item.operatorName ?? "Não informado",
        formatReportMoney(item.totalCents),
        formatSaleStatusForCsv(item.status),
        formatPaymentMethodsForCsv(item.paymentMethods),
      ]),
    ])

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendas-${getTodayDateStringInTimeZone()}.csv"`,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error.issues[0]?.message ?? "Filtros inválidos.", 400)
    }

    return getErrorResponse(
      error instanceof Error
        ? error.message
        : "Não foi possível exportar o relatório de vendas.",
      500
    )
  }
}
