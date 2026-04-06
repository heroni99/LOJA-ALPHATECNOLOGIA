import { NextResponse } from "next/server"

import { createScannerSession } from "@/lib/scanner-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export async function POST() {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const session = await createScannerSession(storeContext.storeId)

    return NextResponse.json({ data: session }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a sessão do scanner.",
      },
      { status: 500 }
    )
  }
}
