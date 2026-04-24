import Link from "next/link"
import { FileText, Printer, Receipt, WalletCards } from "lucide-react"
import { notFound } from "next/navigation"

import { FiscalCancelButton } from "@/components/fiscal/fiscal-cancel-button"
import { FiscalFilters } from "@/components/fiscal/fiscal-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getFiscalListFilters,
  getFiscalStatusClasses,
  getFiscalStatusLabel,
  type FiscalDocumentSummary,
} from "@/lib/fiscal"
import { listFiscalDocuments } from "@/lib/fiscal-server"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"
import { getStoreSnapshot } from "@/lib/stores-server"
import {
  getMonthStartDateString,
  getTodayDateStringInTimeZone,
} from "@/lib/store-time"

type FiscalPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const columns: DataTableColumn<FiscalDocumentSummary>[] = [
  {
    key: "receipt_number",
    header: "Comprovante",
    cell: (document) => (
      <span className="font-medium text-foreground">{document.receiptNumber}</span>
    ),
  },
  {
    key: "sale_number",
    header: "Venda",
    cell: (document) => document.saleNumber,
  },
  {
    key: "issued_at",
    header: "Data",
    cell: (document) => formatDateTime(document.issuedAt),
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (document) => document.customerName ?? "Consumidor final",
    className: "whitespace-normal",
  },
  {
    key: "total",
    header: "Total",
    cell: (document) => formatCentsToBRL(document.totalCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (document) => (
      <Badge className={getFiscalStatusClasses(document.status)}>
        {getFiscalStatusLabel(document.status)}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "Ações",
    cell: (document) => (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/api/fiscal/${document.id}/receipt`}
            target="_blank"
            rel="noreferrer"
          >
            <Printer />
            Imprimir
          </Link>
        </Button>
        {document.status === "ISSUED" ? (
          <FiscalCancelButton
            documentId={document.id}
            receiptNumber={document.receiptNumber}
          />
        ) : null}
      </div>
    ),
    className: "whitespace-normal",
  },
]

export default async function FiscalPage({
  searchParams = {},
}: FiscalPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const store = await getStoreSnapshot(storeContext.storeId)
  const today = getTodayDateStringInTimeZone(store.timezone)
  const filters = getFiscalListFilters(searchParams, {
    start: getMonthStartDateString(today),
    end: today,
  })
  const fiscal = await listFiscalDocuments(storeContext.storeId, filters, store.timezone)
  const totalDocuments = fiscal.stats.issuedCount + fiscal.stats.cancelledCount

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fiscal"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {totalDocuments} {totalDocuments === 1 ? "comprovante" : "comprovantes"}
          </Badge>
        }
        description="Consulte comprovantes internos emitidos, acompanhe cancelamentos e imprima vias quando necessário."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Total emitido no período"
          value={formatCentsToBRL(fiscal.stats.totalIssuedCents)}
          description={`${filters.start} até ${filters.end}`}
          icon={<WalletCards className="size-5" />}
        />
        <StatCard
          title="Qtd comprovantes emitidos"
          value={fiscal.stats.issuedCount.toLocaleString("pt-BR")}
          description="Comprovantes com status emitido dentro do período selecionado."
          variant="success"
          icon={<Receipt className="size-5" />}
        />
        <StatCard
          title="Qtd cancelados"
          value={fiscal.stats.cancelledCount.toLocaleString("pt-BR")}
          description="Documentos cancelados no período selecionado."
          variant="danger"
          icon={<FileText className="size-5" />}
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Defina o período de emissão e refine os resultados pelo status do comprovante."
      >
        <FiscalFilters
          currentStart={filters.start}
          currentEnd={filters.end}
          currentStatus={filters.status}
        />
      </SectionCard>

      <SectionCard
        title="Comprovantes"
        description="A listagem mostra os comprovantes REC emitidos para vendas da loja."
      >
        <DataTable
          columns={columns}
          data={fiscal.items}
          getRowKey={(document) => document.id}
          emptyState={
            <EmptyState
              icon={Receipt}
              title="Nenhum comprovante encontrado."
              description="Ajuste o período ou emita novos comprovantes pelo PDV e pela tela da venda."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
