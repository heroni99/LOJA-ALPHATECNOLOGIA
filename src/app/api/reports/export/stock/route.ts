import { NextRequest } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { buildCsv, formatReportMoney, getStockReportFilters } from "@/lib/reports"
import { getStockReport } from "@/lib/reports-server"
import { getTodayDateStringInTimeZone } from "@/lib/store-time"

function getErrorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return getErrorResponse("Usuário não autenticado.", 401)
    }

    const filters = getStockReportFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const report = await getStockReport(storeContext.storeId, filters)
    const csv = buildCsv([
      ["Código", "Nome", "Categoria", "Estoque total", "Mínimo", "Custo", "Preço"],
      ...report.items.map((item) => [
        item.internalCode,
        item.name,
        item.categoryName ?? "Sem categoria",
        item.totalQuantity,
        item.stockMin,
        formatReportMoney(item.costPriceCents),
        formatReportMoney(item.salePriceCents),
      ]),
    ])

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="estoque-${getTodayDateStringInTimeZone()}.csv"`,
      },
    })
  } catch (error) {
    return getErrorResponse(
      error instanceof Error
        ? error.message
        : "Não foi possível exportar o relatório de estoque.",
      500
    )
  }
}
