import { NextRequest, NextResponse } from "next/server"

import {
  getProductApiErrorMessage,
  toProductQuickSearchDto,
} from "@/lib/products-api"
import { getCurrentStoreContext, searchProductsQuick } from "@/lib/products-server"
import { parseBooleanFilter } from "@/lib/products"

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

    const isService = parseBooleanFilter(
      request.nextUrl.searchParams.get("is_service") ?? undefined
    )
    const active = parseBooleanFilter(
      request.nextUrl.searchParams.get("active") ?? "true"
    )
    const result = await searchProductsQuick(storeContext.storeId, query, {
      limit: 10,
      active,
      isService,
    })

    return NextResponse.json({
      data: result.map(toProductQuickSearchDto),
    })
  } catch (error) {
    return NextResponse.json(
      { error: getProductApiErrorMessage(error) },
      { status: 500 }
    )
  }
}
