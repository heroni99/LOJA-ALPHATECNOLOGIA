import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import { pairScannerSession } from "@/lib/scanner-server"
import { scannerPairSchema } from "@/lib/scanner"

function getPairErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400
  }

  if (
    error instanceof Error &&
    /pareamento|scanner|sessão|código|expirado/i.test(error.message)
  ) {
    return 400
  }

  return 500
}

function getPairErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível conectar o scanner."
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = scannerPairSchema.parse(body)
    const session = await pairScannerSession(payload.pairing_code)

    return NextResponse.json({ data: session })
  } catch (error) {
    return NextResponse.json(
      { error: getPairErrorMessage(error) },
      { status: getPairErrorStatus(error) }
    )
  }
}
