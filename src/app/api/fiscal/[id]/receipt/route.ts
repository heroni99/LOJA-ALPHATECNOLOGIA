import { NextRequest, NextResponse } from "next/server"

import { getFiscalReceiptHtml } from "@/lib/fiscal-server"
import { getCurrentStoreContext } from "@/lib/products-server"

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

    const htmlContent = await getFiscalReceiptHtml(params.id, storeContext.storeId)

    if (!htmlContent) {
      return NextResponse.json(
        { error: "Comprovante não encontrado." },
        { status: 404 }
      )
    }

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o comprovante.",
      },
      { status: 500 }
    )
  }
}
