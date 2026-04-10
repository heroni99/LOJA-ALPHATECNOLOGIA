import { NextRequest, NextResponse } from "next/server"

import { toPdvSearchResultDto } from "@/lib/pdv-api"
import { searchPdvCatalog } from "@/lib/pdv-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getValidationMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a busca do PDV."
}

function getErrorStatus(error: unknown) {
  if (
    error instanceof Error &&
    /pdv|estoque|local|produto|loja/i.test(error.message)
  ) {
    return 400
  }

  return 500
}

export async function GET(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""

    if (!query) {
      return NextResponse.json({ data: [] })
    }

    const results = await searchPdvCatalog(storeContext.storeId, query)

    return NextResponse.json({ data: results.map(toPdvSearchResultDto) })
  } catch (error) {
    return NextResponse.json(
      { error: getValidationMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
