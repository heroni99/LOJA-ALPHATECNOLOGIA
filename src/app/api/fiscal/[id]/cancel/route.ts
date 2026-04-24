import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { fiscalCancelSchema } from "@/lib/fiscal"
import { cancelFiscalDocument } from "@/lib/fiscal-server"
import { getCurrentStoreContext } from "@/lib/products-server"

type RouteContext = {
  params: {
    id: string
  }
}

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

  return "Não foi possível cancelar o comprovante."
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const payload = fiscalCancelSchema.parse(body)
    const document = await cancelFiscalDocument(
      params.id,
      storeContext.storeId,
      storeContext.userId,
      payload.reason
    )

    if (!document) {
      return NextResponse.json(
        { error: "Comprovante não encontrado." },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
