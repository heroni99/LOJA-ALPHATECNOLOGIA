import Link from "next/link"
import { Download, Receipt } from "lucide-react"
import { notFound } from "next/navigation"

import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import { SalesReportFilters } from "@/components/reports/sales-report-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  formatPaymentMethodsForDisplay,
  getSalesReportFilters,
  type SalesReportRow,
} from "@/lib/reports"
import { getSalesReport } from "@/lib/reports-server"
import { getStoreSnapshot } from "@/lib/stores-server"
import {
  formatDateTimeInTimeZone,
  getMonthStartDateString,
  getTodayDateStringInTimeZone,
} from "@/lib/store-time"
import { formatCentsToBRL } from "@/lib/products"

type SalesReportPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildSalesExportHref(filters: ReturnType<typeof getSalesReportFilters>) {
  const params = new URLSearchParams({
    start: filters.start,
    end: filters.end,
  })

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.status) {
    params.set("status", filters.status)
  }

  return `/api/reports/export/sales?${params.toString()}`
}

export default async function SalesReportPage({
  searchParams = {},
}: SalesReportPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const store = await getStoreSnapshot(storeContext.storeId)
  const today = getTodayDateStringInTimeZone(store.timezone)
  const filters = getSalesReportFilters(searchParams, {
    start: getMonthStartDateString(today),
    end: today,
  })
  const report = await getSalesReport(storeContext.storeId, filters)

  const columns: DataTableColumn<SalesReportRow>[] = [
    {
      key: "sale_number",
      header: "Venda",
      cell: (item) => <span className="font-medium text-foreground">{item.saleNumber}</span>,
    },
    {
      key: "date",
      header: "Data",
      cell: (item) =>
        formatDateTimeInTimeZone(item.completedAt ?? item.createdAt, store.timezone),
    },
    {
      key: "customer",
      header: "Cliente",
      cell: (item) => item.customerName ?? "Consumidor final",
      className: "whitespace-normal",
    },
    {
      key: "operator",
      header: "Operador",
      cell: (item) => item.operatorName ?? "Não informado",
    },
    {
      key: "payment_methods",
      header: "Forma pagamento",
      cell: (item) => formatPaymentMethodsForDisplay(item.paymentMethods),
      className: "whitespace-normal",
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <SaleStatusBadge status={item.status} />,
    },
    {
      key: "total",
      header: "Total",
      cell: (item) => formatCentsToBRL(item.totalCents),
      className: "text-right",
      headClassName: "text-right",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatório de vendas"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {report.count} {report.count === 1 ? "venda" : "vendas"}
          </Badge>
        }
        description="Consulte as vendas do período, acompanhe ticket médio e exporte os resultados em CSV."
        backHref="/reports"
        actions={
          <Button asChild>
            <Link href={buildSalesExportHref(filters)}>
              <Download />
              Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Total do período"
          value={formatCentsToBRL(report.totalCents)}
          description={`${filters.start} até ${filters.end}`}
        />
        <StatCard
          title="Qtd vendas"
          value={report.count.toLocaleString("pt-BR")}
          description="Quantidade de registros encontrados com os filtros atuais."
          variant="success"
        />
        <StatCard
          title="Ticket médio"
          value={formatCentsToBRL(report.averageTicketCents)}
          description="Média calculada com base nas vendas retornadas."
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Defina período, busque por número ou cliente e refine pela situação atual da venda."
      >
        <SalesReportFilters
          currentSearch={filters.search}
          currentStatus={filters.status}
          currentStart={filters.start}
          currentEnd={filters.end}
        />
      </SectionCard>

      <SectionCard
        title="Vendas do período"
        description="A listagem reflete exatamente os filtros aplicados e permite abrir o detalhe de cada venda."
      >
        <DataTable
          columns={columns}
          data={report.items}
          getRowKey={(item) => item.id}
          getRowHref={(item) => `/sales/${item.id}`}
          emptyState={
            <EmptyState
              icon={Receipt}
              title="Nenhuma venda encontrada."
              description="Ajuste o período ou os filtros para localizar vendas no relatório."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
