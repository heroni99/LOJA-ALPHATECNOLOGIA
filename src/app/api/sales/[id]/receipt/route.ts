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
          <td class="item-qty">${escapeHtml(formatPdvReceiptItemQuantity(item.quantity))}</td>
          <td class="item-total">${escapeHtml(formatCentsToBRL(item.totalPriceCents))}</td>
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
        font-family: Inter, Arial, sans-serif;
      }
      body {
        margin: 0;
        background: #fff;
        color: #111827;
      }
      .receipt {
        width: 80mm;
        margin: 0 auto;
        padding: 12px 10px 24px;
      }
      h1, h2, p {
        margin: 0;
      }
      .center {
        text-align: center;
      }
      .store {
        font-size: 16px;
        font-weight: 700;
      }
      .muted {
        color: #6b7280;
        font-size: 11px;
      }
      .separator {
        border-top: 1px dashed #d1d5db;
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
        padding: 4px 0;
        vertical-align: top;
      }
      th {
        text-align: left;
        font-size: 11px;
        color: #6b7280;
        font-weight: 600;
      }
      .item-name {
        width: 60%;
      }
      .item-qty {
        width: 15%;
        text-align: center;
      }
      .item-total {
        width: 25%;
        text-align: right;
        white-space: nowrap;
      }
      .meta {
        color: #6b7280;
        font-size: 10px;
      }
      .totals {
        display: grid;
        gap: 6px;
        font-size: 12px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .total-line.strong {
        font-size: 14px;
        font-weight: 700;
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
        <h1 class="store">${escapeHtml(data.storeName)}</h1>
        <p class="muted">Comprovante de venda</p>
      </section>

      <div class="separator"></div>

      <section class="block">
        <p><strong>Venda:</strong> ${escapeHtml(data.sale.saleNumber)}</p>
        <p><strong>Data:</strong> ${escapeHtml(formatDateTime(data.sale.completedAt ?? new Date().toISOString()))}</p>
        <p><strong>Operador:</strong> ${escapeHtml(data.operatorName ?? "Operador")}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(data.customer?.name ?? "Consumidor final")}</p>
      </section>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="item-qty">Qtd.</th>
            <th class="item-total">Total</th>
          </tr>
        </thead>
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
        <div class="total-line">
          <span>Desconto</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.discountAmountCents))}</strong>
        </div>
        <div class="total-line strong">
          <span>Total</span>
          <strong>${escapeHtml(formatCentsToBRL(data.sale.totalCents))}</strong>
        </div>
      </section>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th>Pagamento</th>
            <th class="item-total">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsHtml}
        </tbody>
      </table>

      <div class="separator"></div>

      <section class="center muted">
        <p>ALPHA TECNOLOGIA</p>
        <p>Comprovante gerado pelo sistema</p>
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
