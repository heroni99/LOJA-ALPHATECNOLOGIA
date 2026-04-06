import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { listAccountsReceivable } from "@/lib/financial-server"
import { getAccountFilters, receivableStatusSchema } from "@/lib/financial"

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const filters = getAccountFilters(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
      receivableStatusSchema
    )
    const result = await listAccountsReceivable(storeContext.storeId, filters)

    return NextResponse.json({
      data: result.items,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        filters,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as contas a receber.",
      },
      { status: 500 }
    )
  }
}
