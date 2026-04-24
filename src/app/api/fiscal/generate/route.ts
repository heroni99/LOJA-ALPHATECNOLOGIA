import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { fiscalGenerateSchema } from "@/lib/fiscal"
import { generateFiscalDocument } from "@/lib/fiscal-server"
import { getCurrentStoreContext } from "@/lib/products-server"

function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error && "status" in error) {
    return Number((error as Error & { status?: number }).status ?? 500)
  }

  return 500
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível gerar o comprovante."
}

export async function POST(request: NextRequest) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = fiscalGenerateSchema.parse(body)
    const result = await generateFiscalDocument(
      payload.sale_id,
      storeContext.storeId
    )

    if (!result) {
      return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 })
    }

    return NextResponse.json(
      {
        data: {
          id: result.document.id,
          receiptNumber: result.document.receiptNumber,
          status: result.document.status,
        },
      },
      { status: result.created ? 201 : 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
