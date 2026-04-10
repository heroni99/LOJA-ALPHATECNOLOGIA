import { NextRequest, NextResponse } from "next/server"

import { formatCentsToBRL } from "@/lib/products"
import { getCurrentStoreContext, getProductFullDetail } from "@/lib/products-server"

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

function truncateLabel(value: string, size: number) {
  if (value.length <= size) {
    return value
  }

  return `${value.slice(0, size - 1)}…`
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
  }

  const detail = await getProductFullDetail(params.id, storeContext.storeId)

  if (!detail) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
  }

  const primaryCode =
    detail.codes.find((code) => code.isPrimary)?.code ??
    `ALPHA-${detail.product.internalCode}`
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(detail.product.internalCode)} - Etiqueta</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: 60mm 40mm; margin: 2mm; }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body {
        width: 60mm;
        height: 40mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #fff;
        color: #111827;
        font-family: Arial, sans-serif;
      }
      body {
        display: flex;
        align-items: stretch;
        justify-content: center;
      }
      .label {
        width: 56mm;
        height: 36mm;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 1mm;
        align-content: start;
        border: 0.25mm solid #e5e7eb;
        padding: 1.5mm;
      }
      .name {
        font-size: 10px;
        line-height: 1.1;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .price {
        font-size: 12px;
        font-weight: 700;
      }
      .barcode-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 14mm;
      }
      #barcode {
        width: 100%;
        height: 100%;
      }
      .internal {
        text-align: center;
        font-size: 9px;
        letter-spacing: 0.12em;
        font-weight: 700;
      }
      @media print {
        body { width: auto; height: auto; }
        .label { border-color: transparent; }
      }
    </style>
  </head>
  <body onload="window.print()">
    <main class="label">
      <div class="name">${escapeHtml(truncateLabel(detail.product.name, 22))}</div>
      <div class="price">${escapeHtml(formatCentsToBRL(detail.product.salePriceCents))}</div>
      <div class="barcode-wrap">
        <svg id="barcode"></svg>
      </div>
      <div class="internal">${escapeHtml(detail.product.internalCode)}</div>
    </main>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <script>
      JsBarcode("#barcode", ${JSON.stringify(primaryCode)}, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1.1,
        height: 34
      });
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
