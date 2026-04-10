import { NextResponse } from "next/server"

import { getDashboardServiceOrdersSummary } from "@/lib/dashboard-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível carregar o resumo das ordens de serviço."
}

export async function GET() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const summary = await getDashboardServiceOrdersSummary(storeContext.storeId)

    return NextResponse.json({
      data: {
        open: summary.open,
        waiting_approval: summary.waitingApproval,
        in_progress: summary.inProgress,
        ready: summary.ready,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
