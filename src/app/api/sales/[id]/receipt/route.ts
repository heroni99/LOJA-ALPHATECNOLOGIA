import { NextRequest, NextResponse } from "next/server"

import {
  formatCentsToBRL,
  formatDateTime,
  formatPdvReceiptItemQuantity,
  getPdvPaymentMethodLabel,
} from "@/lib/pdv"
import { getSaleReceiptData } from "@/lib/pdv-server"
import { getCurrentStoreContext } from "@/lib/products-server"

type RouteContext = {
  params: {
    id: string
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderReceiptHtml(data: NonNullable<Awaited<ReturnType<typeof getSaleReceiptData>>>) {
  const itemsHtml = data.sale.items
    .map(
      (item) => `
        <tr>
          <td class="item-name">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="meta">${escapeHtml(item.internalCode)}${item.imeiOrSerial ? ` • ${escapeHtml(item.imeiOrSerial)}` : ""}</div>
          </td>
          <td class="item-total">
            ${escapeHtml(`${formatPdvReceiptItemQuantity(item.quantity)} x ${formatCentsToBRL(item.unitPriceCents)}`)}
            <div class="item-strong">${escapeHtml(formatCentsToBRL(item.totalPriceCents))}</div>
          </td>
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
    <title>Comprovante ${escapeHtml(data.sale.saleNumber)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        font-family: "Courier New", monospace;
      }
      body {
        margin: 0;
        background: #fff;
        color: #111;
      }
      .receipt {
        width: 80mm;
        margin: 0 auto;
        padding: 14px 10px 24px;
      }
      h1, h2, p {
        margin: 0;
      }
      .center {
        text-align: center;
      }
      .store {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .muted {
        font-size: 11px;
      }
      .separator {
        border-top: 1px dashed #888;
        margin: 12px 0;
      }
      .block {
        display: grid;
        gap: 4px;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        padding: 3px 0;
        vertical-align: top;
      }
      th {
        text-align: left;
        font-size: 10px;
        font-weight: 600;
      }
      .item-name {
        width: 64%;
      }
      .item-total {
        width: 36%;
        text-align: right;
        white-space: nowrap;
      }
      .item-strong {
        font-weight: 700;
      }
      .meta {
        font-size: 10px;
      }
      .totals {
        display: grid;
        gap: 4px;
        font-size: 12px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .total-line.strong {
        font-size: 16px;
        font-weight: 700;
      }
      .footer-note {
        display: grid;
        gap: 4px;
      }
      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body onload="window.print()">
    <main class="receipt">
      <section class="center">
        <h1 class="store">${escapeHtml(data.storeName || "ALPHA TECNOLOGIA")}</h1>
      </section>

      <div class="separator"></div>

      <section class="block">
        <p><strong>Venda nº</strong> ${escapeHtml(data.sale.saleNumber)}</p>
        <p><strong>Data:</strong> ${escapeHtml(formatDateTime(data.sale.completedAt ?? new Date().toISOString()))}</p>
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
        <div class="total-line">
          <span>Subtotal</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.subtotalCents))}</strong>
        </div>
        ${
          data.sale.discountAmountCents > 0
            ? `
        <div class="total-line">
          <span>Desconto</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.discountAmountCents))}</strong>
        </div>
        `
            : ""
        }
        <div class="total-line strong">
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

      <section class="center muted footer-note">
        <p>Documento sem valor fiscal</p>
        <p>Obrigado pela preferência!</p>
      </section>
    </main>
  </body>
</html>`
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const receiptData = await getSaleReceiptData(params.id, storeContext.storeId)

    if (!receiptData) {
      return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 })
    }

    return new NextResponse(renderReceiptHtml(receiptData), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o comprovante.",
      },
      { status: 500 }
    )
  }
}
