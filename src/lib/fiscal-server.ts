import "server-only"

import {
  type FiscalDocumentSummary,
  type FiscalListFilters,
  type FiscalListStats,
  type FiscalStatus,
} from "@/lib/fiscal"
import {
  formatCentsToBRL,
  formatDateTime,
  formatPdvReceiptItemQuantity,
  getPdvPaymentMethodLabel,
} from "@/lib/pdv"
import { getSaleReceiptData } from "@/lib/pdv-server"
import { parseDbMoneyToCents } from "@/lib/products"
import { getDateRangeUtc } from "@/lib/store-time"
import { createClient } from "@/lib/supabase/server"

type StatusError = Error & {
  status?: number
}

type SaleRelationRecord = {
  id: string
  sale_number: string
  total: number | string | null
  customer_id: string | null
}

type CustomerRecord = {
  id: string
  name: string
}

type FiscalDocumentRecord = {
  id: string
  store_id: string
  sale_id: string
  receipt_number: string
  status: FiscalStatus
  html_content: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  cancelled_by: string | null
  issued_at: string
  created_at: string
  sales?: SaleRelationRecord | SaleRelationRecord[] | null
}

type FiscalStatsRecord = {
  status: FiscalStatus
  sales?: Pick<SaleRelationRecord, "total"> | Array<Pick<SaleRelationRecord, "total">> | null
}

type FiscalLookupResult = {
  document: FiscalDocumentSummary
  created: boolean
}

type SaleReceiptPayload = NonNullable<Awaited<ReturnType<typeof getSaleReceiptData>>>

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function createStatusError(status: number, message: string) {
  const error = new Error(message) as StatusError
  error.status = status
  return error
}

function isDatabaseErrorLike(
  error: unknown
): error is { code?: string; message?: string; details?: string | null } {
  return typeof error === "object" && error !== null
}

function isUniqueConstraintError(error: unknown, constraint: string) {
  if (!isDatabaseErrorLike(error) || error.code !== "23505") {
    return false
  }

  return [error.message, error.details].filter(Boolean).join(" ").includes(constraint)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderFiscalReceiptHtml(data: SaleReceiptPayload, receiptNumber: string) {
  const itemsHtml = data.sale.items
    .map(
      (item) => `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-total">${escapeHtml(`${formatPdvReceiptItemQuantity(item.quantity)} x ${formatCentsToBRL(item.totalPriceCents)}`)}</td>
        </tr>
      `
    )
    .join("")

  const paymentsHtml = data.sale.payments
    .map(
      (payment) => `
        <tr>
          <td>${escapeHtml(getPdvPaymentMethodLabel(payment.method))}</td>
          <td class="item-total">${escapeHtml(formatCentsToBRL(payment.amountCents))}</td>
        </tr>
      `
    )
    .join("")

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Comprovante ${escapeHtml(receiptNumber)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page {
        width: 80mm;
        margin: 4mm;
      }
      :root {
        color-scheme: light;
        font-family: "Courier New", monospace;
      }
      body {
        margin: 0;
        background: #fff;
        color: #111;
        font-family: "Courier New", monospace;
        font-size: 11px;
      }
      .receipt {
        width: 80mm;
        margin: 0 auto;
        padding: 0;
      }
      h1, p {
        margin: 0;
      }
      .center {
        text-align: center;
      }
      .store {
        font-size: 17px;
        font-weight: 700;
      }
      .separator {
        border-top: 1px dashed #888;
        margin: 10px 0;
      }
      .block {
        display: grid;
        gap: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td {
        padding: 2px 0;
        vertical-align: top;
      }
      .item-name {
        width: 68%;
      }
      .item-total {
        width: 32%;
        text-align: right;
        white-space: nowrap;
      }
      .totals {
        display: grid;
        gap: 4px;
      }
      .line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .line.total {
        font-size: 14px;
        font-weight: 700;
      }
      .notice {
        display: grid;
        gap: 3px;
        text-align: center;
      }
      .cancelled {
        margin-top: 10px;
        border: 1px solid #b91c1c;
        padding: 8px;
        text-align: center;
        color: #b91c1c;
        font-weight: 700;
      }
    </style>
  </head>
  <body onload="window.print()">
    <main class="receipt">
      <section class="center">
        <h1 class="store">${escapeHtml(data.storeName || "ALPHA TECNOLOGIA")}</h1>
      </section>

      <div class="separator"></div>

      <section class="center block">
        <p><strong>COMPROVANTE INTERNO</strong></p>
        <p><strong>Nº ${escapeHtml(receiptNumber)}</strong></p>
      </section>

      <div class="separator"></div>

      <section class="block">
        <p><strong>Data/hora:</strong> ${escapeHtml(formatDateTime(data.sale.completedAt ?? new Date().toISOString()))}</p>
        <p><strong>Operador:</strong> ${escapeHtml(data.operatorName ?? "Sistema")}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(data.customer?.name ?? "Consumidor final")}</p>
      </section>

      <div class="separator"></div>

      <table>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="separator"></div>

      <section class="totals">
        <div class="line">
          <span>Subtotal</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.subtotalCents))}</strong>
        </div>
        ${
          data.sale.discountAmountCents > 0
            ? `
        <div class="line">
          <span>Desconto</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.discountAmountCents))}</strong>
        </div>
        `
            : ""
        }
        <div class="line total">
          <span>TOTAL</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.totalCents))}</strong>
        </div>
      </section>

      <div class="separator"></div>

      <table>
        <tbody>
          ${paymentsHtml}
        </tbody>
      </table>

      <div class="separator"></div>

      <section class="notice">
        <p>Documento sem valor fiscal</p>
        <p>Obrigado pela preferência!</p>
      </section>
    </main>
  </body>
</html>`
}

function renderCancelledFiscalHtml(htmlContent: string, cancelReason: string | null) {
  const cancelledBlock = `
      <div class="cancelled">
        <p>CANCELADO</p>
        ${
          cancelReason
            ? `<p style="margin-top: 6px; font-size: 11px; font-weight: 400;">Motivo: ${escapeHtml(cancelReason)}</p>`
            : ""
        }
      </div>
`

  if (htmlContent.includes("<div class=\"cancelled\">")) {
    return htmlContent
  }

  return htmlContent.replace("</main>", `${cancelledBlock}</main>`)
}

async function listCustomersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, CustomerRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as CustomerRecord[]).map((customer) => [customer.id, customer]))
}

function mapFiscalDocumentSummary(
  record: FiscalDocumentRecord,
  customerMap: Map<string, CustomerRecord>
): FiscalDocumentSummary {
  const sale = getSingleRelation(record.sales)

  return {
    id: record.id,
    saleId: record.sale_id,
    saleNumber: sale?.sale_number ?? "Venda",
    receiptNumber: record.receipt_number,
    customerName: sale?.customer_id ? customerMap.get(sale.customer_id)?.name ?? null : null,
    totalCents: parseDbMoneyToCents(sale?.total),
    status: record.status,
    issuedAt: record.issued_at,
    cancelledAt: record.cancelled_at,
    cancelReason: record.cancel_reason,
  }
}

async function getFiscalDocumentRecord(
  id: string,
  storeId: string
): Promise<FiscalDocumentRecord | null> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("fiscal_documents")
    .select(
      "id, store_id, sale_id, receipt_number, status, html_content, cancelled_at, cancel_reason, cancelled_by, issued_at, created_at"
    )
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as FiscalDocumentRecord | null) ?? null
}

async function getFiscalDocumentRecordBySaleId(
  saleId: string,
  storeId: string
): Promise<FiscalDocumentRecord | null> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("fiscal_documents")
    .select(
      "id, store_id, sale_id, receipt_number, status, html_content, cancelled_at, cancel_reason, cancelled_by, issued_at, created_at, sales!inner(id, sale_number, total, customer_id)"
    )
    .eq("store_id", storeId)
    .eq("sale_id", saleId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as FiscalDocumentRecord | null) ?? null
}

export async function getFiscalDocumentBySaleId(
  saleId: string,
  storeId: string
): Promise<FiscalDocumentSummary | null> {
  const record = await getFiscalDocumentRecordBySaleId(saleId, storeId)

  if (!record) {
    return null
  }

  const sale = getSingleRelation(record.sales)
  const customerMap = await listCustomersByIds(
    sale?.customer_id ? [sale.customer_id] : []
  )

  return mapFiscalDocumentSummary(record, customerMap)
}

export async function getFiscalReceiptHtml(id: string, storeId: string) {
  const record = await getFiscalDocumentRecord(id, storeId)

  if (!record) {
    return null
  }

  const htmlContent = record.html_content ?? ""

  if (!htmlContent.trim()) {
    throw new Error("O comprovante não possui conteúdo para impressão.")
  }

  if (record.status === "CANCELLED") {
    return renderCancelledFiscalHtml(htmlContent, record.cancel_reason)
  }

  return htmlContent
}

export async function listFiscalDocuments(
  storeId: string,
  filters: FiscalListFilters,
  timeZone: string
): Promise<{
  items: FiscalDocumentSummary[]
  stats: FiscalListStats
}> {
  const supabase = await createClient({ serviceRole: true })
  const dateRange = getDateRangeUtc(filters.start, filters.end, timeZone)

  let listQuery = supabase
    .from("fiscal_documents")
    .select(
      "id, store_id, sale_id, receipt_number, status, cancelled_at, cancel_reason, issued_at, created_at, sales!inner(id, sale_number, total, customer_id)"
    )
    .eq("store_id", storeId)
    .gte("issued_at", dateRange.start.toISOString())
    .lt("issued_at", dateRange.end.toISOString())
    .order("issued_at", { ascending: false })

  if (filters.status) {
    listQuery = listQuery.eq("status", filters.status)
  }

  const statsQuery = supabase
    .from("fiscal_documents")
    .select("status, sales!inner(total)")
    .eq("store_id", storeId)
    .gte("issued_at", dateRange.start.toISOString())
    .lt("issued_at", dateRange.end.toISOString())

  const [listResult, statsResult] = await Promise.all([listQuery, statsQuery])

  if (listResult.error) {
    throw listResult.error
  }

  if (statsResult.error) {
    throw statsResult.error
  }

  const records = (listResult.data ?? []) as FiscalDocumentRecord[]
  const customerIds = Array.from(
    new Set(
      records
        .map((record) => getSingleRelation(record.sales)?.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const customerMap = await listCustomersByIds(customerIds)

  const stats = ((statsResult.data ?? []) as FiscalStatsRecord[]).reduce<FiscalListStats>(
    (accumulator, record) => {
      const sale = getSingleRelation(record.sales)

      if (record.status === "ISSUED") {
        accumulator.totalIssuedCents += parseDbMoneyToCents(sale?.total)
        accumulator.issuedCount += 1
      }

      if (record.status === "CANCELLED") {
        accumulator.cancelledCount += 1
      }

      return accumulator
    },
    {
      totalIssuedCents: 0,
      issuedCount: 0,
      cancelledCount: 0,
    }
  )

  return {
    items: records.map((record) => mapFiscalDocumentSummary(record, customerMap)),
    stats,
  }
}

export async function generateFiscalDocument(
  saleId: string,
  storeId: string
): Promise<FiscalLookupResult | null> {
  const existing = await getFiscalDocumentBySaleId(saleId, storeId)

  if (existing) {
    return {
      document: existing,
      created: false,
    }
  }

  const receiptData = await getSaleReceiptData(saleId, storeId)

  if (!receiptData) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const receiptNumber = `REC-${Date.now()}`
    const htmlContent = renderFiscalReceiptHtml(receiptData, receiptNumber)
    const { error } = await supabase.from("fiscal_documents").insert({
      store_id: storeId,
      sale_id: saleId,
      receipt_number: receiptNumber,
      status: "ISSUED",
      html_content: htmlContent,
    })

    if (!error) {
      const createdDocument = await getFiscalDocumentBySaleId(saleId, storeId)

      if (!createdDocument) {
        throw new Error("O comprovante foi emitido, mas não pôde ser carregado.")
      }

      return {
        document: createdDocument,
        created: true,
      }
    }

    if (isUniqueConstraintError(error, "fiscal_documents_sale_id_key")) {
      const duplicated = await getFiscalDocumentBySaleId(saleId, storeId)

      if (duplicated) {
        return {
          document: duplicated,
          created: false,
        }
      }
    }

    if (isUniqueConstraintError(error, "receipt_number")) {
      continue
    }

    throw error
  }

  throw new Error("Não foi possível gerar um número de comprovante único.")
}

export async function cancelFiscalDocument(
  id: string,
  storeId: string,
  userId: string,
  reason: string
) {
  const record = await getFiscalDocumentRecord(id, storeId)

  if (!record) {
    return null
  }

  if (record.status === "CANCELLED") {
    throw createStatusError(409, "O comprovante já está cancelado.")
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("fiscal_documents")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      cancelled_by: userId,
    })
    .eq("store_id", storeId)
    .eq("id", id)

  if (error) {
    throw error
  }

  const updated = await getFiscalDocumentBySaleId(record.sale_id, storeId)

  if (!updated) {
    throw new Error("O comprovante foi cancelado, mas não pôde ser recarregado.")
  }

  return updated
}
