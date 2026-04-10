import { NextResponse } from "next/server"

import { getDashboardTodaySnapshot } from "@/lib/dashboard-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar o resumo do dashboard."
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const snapshot = await getDashboardTodaySnapshot(
      storeContext.storeId,
      storeContext.userId
    )

    return NextResponse.json({
      data: {
        total_value: snapshot.totalValueCents,
        count: snapshot.count,
        average_ticket: snapshot.averageTicketCents,
        cancelled_count: snapshot.cancelledCount,
        cash_status: {
          open: snapshot.cashStatus.open,
          terminal_name: snapshot.cashStatus.terminalName,
          operator_name: snapshot.cashStatus.operatorName,
          opened_at: snapshot.cashStatus.openedAt,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
