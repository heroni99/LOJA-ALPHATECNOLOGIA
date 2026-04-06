import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  getServiceOrderReceiptData,
} from "@/lib/service-orders-server"
import {
  buildServiceOrderDeviceLabel,
  formatServiceOrderDate,
  getServiceOrderStatusLabel,
} from "@/lib/service-orders"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"

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

function renderReceiptHtml(
  data: NonNullable<Awaited<ReturnType<typeof getServiceOrderReceiptData>>>
) {
  const { serviceOrder } = data
  const customer = serviceOrder.customer
  const piecesHtml = serviceOrder.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(String(item.quantity))}</td>
          <td>${escapeHtml(formatCentsToBRL(item.unitPriceCents))}</td>
          <td>${escapeHtml(formatCentsToBRL(item.totalPriceCents))}</td>
        </tr>
      `
    )
    .join("")

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(serviceOrder.orderNumber)} - Ordem de serviço</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, Arial, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #f5f5f5;
        color: #111827;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        padding: 16mm;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 2px solid #f97316;
        padding-bottom: 12px;
      }
      .brand h1,
      .brand p,
      .meta p,
      .section h2,
      .section p,
      .section li {
        margin: 0;
      }
      .brand h1 {
        font-size: 24px;
        font-weight: 700;
      }
      .brand p,
      .meta p,
      .field small,
      .help {
        color: #6b7280;
      }
      .meta {
        text-align: right;
        font-size: 12px;
      }
      .grid {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }
      .grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .section {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 14px;
      }
      .section h2 {
        font-size: 14px;
        margin-bottom: 10px;
      }
      .fields {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .field {
        display: grid;
        gap: 4px;
        font-size: 13px;
      }
      .field.full {
        grid-column: 1 / -1;
      }
      .field strong {
        font-size: 14px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th, td {
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
      }
      th:last-child,
      td:last-child {
        text-align: right;
      }
      .summary {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        font-size: 14px;
      }
      .summary-line.total {
        font-size: 18px;
        font-weight: 700;
      }
      .footer {
        margin-top: 18px;
        display: grid;
        gap: 10px;
      }
      .signature {
        border-top: 1px solid #d1d5db;
        padding-top: 10px;
        margin-top: 18px;
      }
      @media print {
        body {
          background: #fff;
        }
        .page {
          margin: 0;
          width: 100%;
          min-height: auto;
          padding: 12mm;
        }
      }
    </style>
  </head>
  <body onload="window.print()">
    <main class="page">
      <header class="header">
        <div class="brand">
          <h1>${escapeHtml(data.storeName)}</h1>
          <p>Comprovante de ordem de serviço</p>
        </div>
        <div class="meta">
          <p><strong>${escapeHtml(serviceOrder.orderNumber)}</strong></p>
          <p>Status: ${escapeHtml(getServiceOrderStatusLabel(serviceOrder.status))}</p>
          <p>Emitido em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        </div>
      </header>

      <section class="grid two">
        <div class="section">
          <h2>Cliente</h2>
          <div class="fields">
            <div class="field"><small>Nome</small><strong>${escapeHtml(customer?.name ?? "Não informado")}</strong></div>
            <div class="field"><small>Telefone</small><strong>${escapeHtml(customer?.phone ?? "Não informado")}</strong></div>
            <div class="field"><small>E-mail</small><strong>${escapeHtml(customer?.email ?? "Não informado")}</strong></div>
            <div class="field"><small>CPF/CNPJ</small><strong>${escapeHtml(customer?.cpfCnpj ?? "Não informado")}</strong></div>
          </div>
        </div>

        <div class="section">
          <h2>Aparelho</h2>
          <div class="fields">
            <div class="field full"><small>Descrição</small><strong>${escapeHtml(buildServiceOrderDeviceLabel(serviceOrder))}</strong></div>
            <div class="field"><small>IMEI</small><strong>${escapeHtml(serviceOrder.imei ?? "Não informado")}</strong></div>
            <div class="field"><small>Serial</small><strong>${escapeHtml(serviceOrder.serialNumber ?? "Não informado")}</strong></div>
            <div class="field"><small>Cor</small><strong>${escapeHtml(serviceOrder.color ?? "Não informado")}</strong></div>
            <div class="field"><small>Acessórios</small><strong>${escapeHtml(serviceOrder.accessories ?? "Não informado")}</strong></div>
          </div>
        </div>
      </section>

      <section class="grid">
        <div class="section">
          <h2>Problema e diagnóstico</h2>
          <div class="fields">
            <div class="field full"><small>Problema relatado</small><strong>${escapeHtml(serviceOrder.reportedIssue)}</strong></div>
            <div class="field full"><small>Diagnóstico encontrado</small><strong>${escapeHtml(serviceOrder.foundIssue ?? "Aguardando diagnóstico")}</strong></div>
            <div class="field full"><small>Notas técnicas</small><strong>${escapeHtml(serviceOrder.technicalNotes ?? "Sem observações técnicas")}</strong></div>
          </div>
        </div>
      </section>

      <section class="grid two">
        <div class="section">
          <h2>Condições comerciais</h2>
          <div class="summary">
            <div class="summary-line"><span>Orçamento</span><strong>${escapeHtml(formatCentsToBRL(serviceOrder.totalEstimatedCents))}</strong></div>
            <div class="summary-line total"><span>Total final</span><strong>${escapeHtml(formatCentsToBRL(serviceOrder.totalFinalCents))}</strong></div>
            <div class="summary-line"><span>Prazo estimado</span><strong>${escapeHtml(formatServiceOrderDate(serviceOrder.estimatedCompletionDate))}</strong></div>
          </div>
        </div>

        <div class="section">
          <h2>Garantia</h2>
          <p class="help">${escapeHtml(data.warrantyText)}</p>
        </div>
      </section>

      <section class="grid">
        <div class="section">
          <h2>Peças lançadas</h2>
          ${
            piecesHtml
              ? `<table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Valor unitário</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>${piecesHtml}</tbody>
                </table>`
              : `<p class="help">Nenhuma peça foi adicionada a esta OS.</p>`
          }
        </div>
      </section>

      <footer class="footer">
        <div class="section">
          <p class="help">Operador responsável: ${escapeHtml(serviceOrder.createdByName ?? "Equipe técnica")}</p>
        </div>
        <div class="signature">
          <p class="help">Assinatura do cliente</p>
        </div>
      </footer>
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

    const receiptData = await getServiceOrderReceiptData(
      params.id,
      storeContext.storeId
    )

    if (!receiptData) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada." },
        { status: 404 }
      )
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
            : "Não foi possível gerar o comprovante da OS.",
      },
      { status: 500 }
    )
  }
}
