import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { publishScannedBarcode } from "@/lib/scanner-server"
import { scannerScanSchema } from "@/lib/scanner"

function getScanErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /não encontrado|expirada|scanner|sessão|pareado|serial|estoque/i.test(
      error.message
    )
  ) {
    return /não encontrado/i.test(error.message) ? 404 : 400
  }

  return 500
}

function getScanErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a leitura do scanner."
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = scannerScanSchema.parse(body)
    const result = await publishScannedBarcode(payload.session_id, payload.barcode)

    return NextResponse.json({
      data: {
        session: result.session,
        product: result.product,
        message: `${result.product.name} enviado para o PDV.`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: getScanErrorMessage(error) },
      { status: getScanErrorStatus(error) }
    )
  }
}
