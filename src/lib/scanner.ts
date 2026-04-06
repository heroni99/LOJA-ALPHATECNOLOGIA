import { z } from "zod"

import type { PdvSearchResult } from "@/lib/pdv"

export const SCANNER_PAIRING_CODE_LENGTH = 6
export const SCANNER_SESSION_TTL_MINUTES = 120
export const SCANNER_CHANNEL_PREFIX = "scanner-"

export const scannerSessionStatusSchema = z.enum([
  "WAITING",
  "CONNECTED",
  "CLOSED",
])

export type ScannerSessionStatus = z.infer<typeof scannerSessionStatusSchema>

export type ScannerSession = {
  id: string
  storeId: string
  pairingCode: string
  status: ScannerSessionStatus
  createdAt: string
  expiresAt: string
}

export type ScannerBroadcastPayload = {
  sessionId: string
  barcode: string
  product: PdvSearchResult
  scannedAt: string
}

export type ScannerPairedPayload = {
  sessionId: string
  pairingCode: string
  connectedAt: string
}

export const scannerPairSchema = z.object({
  pairing_code: z
    .string()
    .trim()
    .min(
      SCANNER_PAIRING_CODE_LENGTH,
      `Informe um código com ${SCANNER_PAIRING_CODE_LENGTH} caracteres.`
    )
    .max(
      SCANNER_PAIRING_CODE_LENGTH,
      `Informe um código com ${SCANNER_PAIRING_CODE_LENGTH} caracteres.`
    )
    .regex(/^[A-Z0-9]{6}$/i, "Código de pareamento inválido."),
})

export const scannerScanSchema = z.object({
  session_id: z.string().uuid("Sessão do scanner inválida."),
  barcode: z
    .string()
    .trim()
    .min(1, "Informe o código de barras lido."),
})

export type ScannerPairInput = z.infer<typeof scannerPairSchema>
export type ScannerScanInput = z.infer<typeof scannerScanSchema>

export function normalizePairingCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
}

export function getScannerChannelName(sessionId: string) {
  return `${SCANNER_CHANNEL_PREFIX}${sessionId}`
}
