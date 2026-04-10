import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { PdvSearchResult } from "@/lib/pdv"
import { parseDbMoneyToCents } from "@/lib/products"
import {
  SCANNER_PAIRING_CODE_LENGTH,
  SCANNER_SESSION_TTL_MINUTES,
  getScannerChannelName,
  normalizePairingCode,
  type ScannerBroadcastPayload,
  type ScannerPairedPayload,
  type ScannerSession,
} from "@/lib/scanner"

type ScannerSessionRecord = {
  id: string
  store_id: string
  pairing_code: string
  status: "WAITING" | "CONNECTED" | "CLOSED"
  created_at: string
  expires_at: string
}

type StockLocationRecord = {
  id: string
  name: string
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
  sale_price: number | string | null
  has_serial_control: boolean
}

type ProductCodeRecord = {
  product_id: string
  product_unit_id: string | null
}

type ProductUnitRecord = {
  id: string
  product_id: string
  imei: string | null
  imei2: string | null
  serial_number: string | null
  current_location_id: string | null
  unit_status: string
}

type StockBalanceRecord = {
  quantity: number | string | null
}

function mapScannerSession(record: ScannerSessionRecord): ScannerSession {
  return {
    id: record.id,
    storeId: record.store_id,
    pairingCode: record.pairing_code,
    status: record.status,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
  }
}

function getScannerExpiresAt() {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + SCANNER_SESSION_TTL_MINUTES)

  return expiresAt.toISOString()
}

function generatePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

  return Array.from({ length: SCANNER_PAIRING_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * alphabet.length)
    return alphabet[index]
  }).join("")
}

function isDuplicatePairingCodeError(error: { code?: string } | null) {
  return error?.code === "23505"
}

function isScannerSessionActive(session: ScannerSessionRecord) {
  return (
    session.status !== "CLOSED" &&
    new Date(session.expires_at).getTime() > Date.now()
  )
}

async function getDefaultStockLocation(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("active", true)
    .eq("is_default", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as StockLocationRecord | null) ?? null
}

async function getSellableProduct(storeId: string, productId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, sale_price, has_serial_control")
    .eq("store_id", storeId)
    .eq("id", productId)
    .eq("active", true)
    .eq("is_service", false)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProductRecord | null) ?? null
}

async function getAvailableUnit(unitId: string, locationId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("product_units")
    .select("id, product_id, imei, imei2, serial_number, current_location_id, unit_status")
    .eq("id", unitId)
    .eq("current_location_id", locationId)
    .eq("unit_status", "IN_STOCK")
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProductUnitRecord | null) ?? null
}

async function getProductStockBalance(productId: string, locationId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_balances")
    .select("quantity")
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const record = (data as StockBalanceRecord | null) ?? null
  const parsed = Number(record?.quantity ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function mapSerializedProduct(product: ProductRecord, unit: ProductUnitRecord): PdvSearchResult {
  return {
    key: `unit:${unit.id}`,
    kind: "unit",
    productId: product.id,
    productUnitId: unit.id,
    internalCode: product.internal_code,
    name: product.name,
    salePriceCents: parseDbMoneyToCents(product.sale_price),
    hasSerialControl: true,
    availableQuantity: 1,
    imageUrl: null,
    category: null,
    imeiOrSerial: unit.imei ?? unit.serial_number ?? unit.imei2 ?? null,
  }
}

function mapProduct(product: ProductRecord, availableQuantity: number): PdvSearchResult {
  return {
    key: `product:${product.id}`,
    kind: "product",
    productId: product.id,
    productUnitId: null,
    internalCode: product.internal_code,
    name: product.name,
    salePriceCents: parseDbMoneyToCents(product.sale_price),
    hasSerialControl: false,
    availableQuantity,
    imageUrl: null,
    category: null,
    imeiOrSerial: null,
  }
}

async function findScannableProductByBarcode(
  storeId: string,
  rawBarcode: string
): Promise<PdvSearchResult | null> {
  const barcode = rawBarcode.trim()

  if (!barcode) {
    return null
  }

  const defaultLocation = await getDefaultStockLocation(storeId)

  if (!defaultLocation) {
    throw new Error("Configure um local de estoque padrão antes de usar o scanner.")
  }

  const supabase = await createClient({ serviceRole: true })
  const [
    codeResult,
    productResult,
    imeiResult,
    imei2Result,
    serialResult,
  ] = await Promise.all([
    supabase
      .from("product_codes")
      .select("product_id, product_unit_id")
      .eq("code", barcode)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, name, internal_code, sale_price, has_serial_control")
      .eq("store_id", storeId)
      .eq("internal_code", barcode)
      .eq("active", true)
      .eq("is_service", false)
      .maybeSingle(),
    supabase
      .from("product_units")
      .select("id, product_id, imei, imei2, serial_number, current_location_id, unit_status")
      .eq("imei", barcode)
      .eq("current_location_id", defaultLocation.id)
      .eq("unit_status", "IN_STOCK")
      .limit(1),
    supabase
      .from("product_units")
      .select("id, product_id, imei, imei2, serial_number, current_location_id, unit_status")
      .eq("imei2", barcode)
      .eq("current_location_id", defaultLocation.id)
      .eq("unit_status", "IN_STOCK")
      .limit(1),
    supabase
      .from("product_units")
      .select("id, product_id, imei, imei2, serial_number, current_location_id, unit_status")
      .eq("serial_number", barcode)
      .eq("current_location_id", defaultLocation.id)
      .eq("unit_status", "IN_STOCK")
      .limit(1),
  ])

  if (codeResult.error) {
    throw codeResult.error
  }

  if (productResult.error) {
    throw productResult.error
  }

  if (imeiResult.error) {
    throw imeiResult.error
  }

  if (imei2Result.error) {
    throw imei2Result.error
  }

  if (serialResult.error) {
    throw serialResult.error
  }

  const productCode = (codeResult.data as ProductCodeRecord | null) ?? null

  if (productCode?.product_unit_id) {
    const unit = await getAvailableUnit(productCode.product_unit_id, defaultLocation.id)

    if (unit) {
      const product = await getSellableProduct(storeId, unit.product_id)

      if (product?.has_serial_control) {
        return mapSerializedProduct(product, unit)
      }
    }
  }

  if (productCode?.product_id) {
    const product = await getSellableProduct(storeId, productCode.product_id)

    if (product) {
      if (product.has_serial_control) {
        throw new Error(
          "O código lido pertence a um produto serializado. Escaneie o IMEI ou serial da unidade."
        )
      }

      const availableQuantity = await getProductStockBalance(
        product.id,
        defaultLocation.id
      )

      if (availableQuantity > 0) {
        return mapProduct(product, availableQuantity)
      }
    }
  }

  const exactUnit =
    ((imeiResult.data ?? [])[0] as ProductUnitRecord | undefined) ??
    ((imei2Result.data ?? [])[0] as ProductUnitRecord | undefined) ??
    ((serialResult.data ?? [])[0] as ProductUnitRecord | undefined)

  if (exactUnit) {
    const product = await getSellableProduct(storeId, exactUnit.product_id)

    if (product?.has_serial_control) {
      return mapSerializedProduct(product, exactUnit)
    }
  }

  const exactProduct = (productResult.data as ProductRecord | null) ?? null

  if (exactProduct) {
    if (exactProduct.has_serial_control) {
      throw new Error(
        "Esse item possui controle serial. Escaneie o IMEI ou serial da unidade."
      )
    }

    const availableQuantity = await getProductStockBalance(
      exactProduct.id,
      defaultLocation.id
    )

    if (availableQuantity > 0) {
      return mapProduct(exactProduct, availableQuantity)
    }
  }

  return null
}

async function broadcastScannerEvent(
  sessionId: string,
  event: string,
  payload: ScannerBroadcastPayload | ScannerPairedPayload
) {
  const supabase = await createClient({ serviceRole: true })
  const channel = supabase.channel(getScannerChannelName(sessionId))
  const result = await channel.httpSend(event, payload, { timeout: 10_000 })

  if (!result.success) {
    throw new Error(result.error || "Não foi possível publicar o evento do scanner.")
  }

  void supabase.removeChannel(channel)
}

async function getScannerSessionRecordById(sessionId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("scanner_sessions")
    .select("id, store_id, pairing_code, status, created_at, expires_at")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ScannerSessionRecord | null) ?? null
}

export async function createScannerSession(storeId: string) {
  const supabase = await createClient({ serviceRole: true })

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const pairingCode = generatePairingCode()
    const expiresAt = getScannerExpiresAt()
    const { data, error } = await supabase
      .from("scanner_sessions")
      .insert({
        store_id: storeId,
        pairing_code: pairingCode,
        status: "WAITING",
        expires_at: expiresAt,
      })
      .select("id, store_id, pairing_code, status, created_at, expires_at")
      .maybeSingle()

    if (isDuplicatePairingCodeError(error)) {
      continue
    }

    if (error) {
      throw error
    }

    if (data) {
      return mapScannerSession(data as ScannerSessionRecord)
    }
  }

  throw new Error("Não foi possível gerar um código único para o scanner.")
}

export async function pairScannerSession(rawPairingCode: string) {
  const pairingCode = normalizePairingCode(rawPairingCode)
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("scanner_sessions")
    .select("id, store_id, pairing_code, status, created_at, expires_at")
    .eq("pairing_code", pairingCode)
    .in("status", ["WAITING", "CONNECTED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  const session = (data as ScannerSessionRecord | null) ?? null

  if (!session || !isScannerSessionActive(session)) {
    throw new Error("Código de pareamento inválido ou expirado.")
  }

  if (session.status !== "CONNECTED") {
    const { data: updatedData, error: updateError } = await supabase
      .from("scanner_sessions")
      .update({
        status: "CONNECTED",
      })
      .eq("id", session.id)
      .select("id, store_id, pairing_code, status, created_at, expires_at")
      .maybeSingle()

    if (updateError) {
      throw updateError
    }

    const updatedSession = mapScannerSession(updatedData as ScannerSessionRecord)
    await broadcastScannerEvent(updatedSession.id, "scanner-paired", {
      sessionId: updatedSession.id,
      pairingCode: updatedSession.pairingCode,
      connectedAt: new Date().toISOString(),
    })

    return updatedSession
  }

  return mapScannerSession(session)
}

export async function publishScannedBarcode(sessionId: string, rawBarcode: string) {
  const sessionRecord = await getScannerSessionRecordById(sessionId)

  if (!sessionRecord || !isScannerSessionActive(sessionRecord)) {
    throw new Error("Sessão do scanner inválida ou expirada.")
  }

  if (sessionRecord.status !== "CONNECTED") {
    throw new Error("O scanner ainda não foi pareado com o PDV.")
  }

  const barcode = rawBarcode.trim()
  const product = await findScannableProductByBarcode(sessionRecord.store_id, barcode)

  if (!product) {
    throw new Error("Nenhum produto encontrado para o código lido.")
  }

  await broadcastScannerEvent(sessionRecord.id, "product-scanned", {
    sessionId: sessionRecord.id,
    barcode,
    product,
    scannedAt: new Date().toISOString(),
  })

  return {
    session: mapScannerSession(sessionRecord),
    product,
  }
}
