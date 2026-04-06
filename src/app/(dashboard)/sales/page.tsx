import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  ShoppingCart,
} from "lucide-react"
import { notFound } from "next/navigation"

import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import { SalesFilters } from "@/components/sales/sales-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"
import { getSaleListFilters, type SaleSummary } from "@/lib/sales"
import { listSales } from "@/lib/sales-server"

type SalesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const saleColumns: DataTableColumn<SaleSummary>[] = [
  {
    key: "sale_number",
    header: "Venda",
    cell: (sale) => <span className="font-medium text-foreground">{sale.saleNumber}</span>,
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (sale) => sale.customerName ?? "Consumidor final",
    className: "whitespace-normal",
  },
  {
    key: "operator",
    header: "Operador",
    cell: (sale) => sale.operatorName ?? "Não informado",
  },
  {
    key: "total",
    header: "Total",
    cell: (sale) => formatCentsToBRL(sale.totalCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (sale) => <SaleStatusBadge status={sale.status} />,
  },
  {
    key: "completed_at",
    header: "Concluída em",
    cell: (sale) => formatDateTime(sale.completedAt ?? sale.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

function buildPageHref(page: number, filters: ReturnType<typeof getSaleListFilters>) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.status) {
    params.set("status", filters.status)
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/sales?${query}` : "/sales"
}

export default async function SalesPage({ searchParams = {} }: SalesPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getSaleListFilters(searchParams)
  const sales = await listSales(storeContext.storeId, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vendas"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {sales.totalCount} {sales.totalCount === 1 ? "venda" : "vendas"}
          </Badge>
        }
        description="Consulte o histórico do PDV, acompanhe status, pagamentos e abra detalhes para registrar devoluções."
        actions={
          <Button asChild>
            <Link href="/pdv">
              <ShoppingCart />
              Abrir PDV
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por número da venda, cliente e refine pela situação atual da operação."
      >
        <SalesFilters
          currentSearch={filters.search}
          currentStatus={filters.status}
        />
      </SectionCard>

      <SectionCard
        title="Histórico"
        description="Clique em uma linha para ver itens vendidos, pagamentos e devoluções vinculadas."
      >
        <DataTable
          columns={saleColumns}
          data={sales.items}
          getRowKey={(sale) => sale.id}
          getRowHref={(sale) => `/sales/${sale.id}`}
          emptyState={
            <EmptyState
              icon={Receipt}
              title="Nenhuma venda encontrada."
              description="Quando novas vendas forem concluídas no PDV, elas aparecerão aqui para consulta e devolução."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {sales.page} de {sales.totalPages}
          </p>
          <div className="flex gap-2">
            {sales.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(sales.page - 1, filters)}>
                  <ChevronLeft />
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft />
                Anterior
              </Button>
            )}
            {sales.page < sales.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(sales.page + 1, filters)}>
                  Próxima
                  <ChevronRight />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Próxima
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
