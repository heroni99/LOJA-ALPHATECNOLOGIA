import Link from "next/link"
import { Download, Package } from "lucide-react"
import { notFound } from "next/navigation"

import { StockReportFilters } from "@/components/reports/stock-report-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCentsToBRL, formatQuantity } from "@/lib/products"
import {
  getCurrentStoreContext,
  listProductCategories,
} from "@/lib/products-server"
import {
  formatStockBalancesForDisplay,
  getStockReportFilters,
  type StockReportRow,
} from "@/lib/reports"
import { getStockReport } from "@/lib/reports-server"
import { getTodayDateStringInTimeZone } from "@/lib/store-time"
import { listStockLocations } from "@/lib/inventory-server"
import { getStoreSnapshot } from "@/lib/stores-server"

type StockReportPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildStockExportHref(filters: ReturnType<typeof getStockReportFilters>) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.categoryId) {
    params.set("category_id", filters.categoryId)
  }

  if (filters.locationId) {
    params.set("location_id", filters.locationId)
  }

  if (filters.lowStock) {
    params.set("low_stock", "true")
  }

  const query = params.toString()

  return query ? `/api/reports/export/stock?${query}` : "/api/reports/export/stock"
}

export default async function StockReportPage({
  searchParams = {},
}: StockReportPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getStockReportFilters(searchParams)
  const store = await getStoreSnapshot(storeContext.storeId)
  const [report, categories, locations] = await Promise.all([
    getStockReport(storeContext.storeId, filters),
    listProductCategories(storeContext.storeId),
    listStockLocations(storeContext.storeId),
  ])
  const lowStockCount = report.items.filter((item) => item.isBelowMin).length
  const columns: DataTableColumn<StockReportRow>[] = [
    {
      key: "internal_code",
      header: "Código",
      cell: (item) => <span className="font-medium text-foreground">{item.internalCode}</span>,
    },
    {
      key: "name",
      header: "Nome",
      cell: (item) => item.name,
      className: "whitespace-normal font-medium text-foreground",
    },
    {
      key: "category",
      header: "Categoria",
      cell: (item) => item.categoryName ?? "Sem categoria",
    },
    {
      key: "stock_total",
      header: "Estoque total",
      cell: (item) => formatQuantity(item.totalQuantity),
      className: "text-right font-semibold",
      headClassName: "text-right",
    },
    {
      key: "locations",
      header: "Saldo por local",
      cell: (item) => formatStockBalancesForDisplay(item.locationBalances),
      className: "whitespace-normal",
    },
    {
      key: "stock_min",
      header: "Mínimo",
      cell: (item) => formatQuantity(item.stockMin),
      className: "text-right",
      headClassName: "text-right",
    },
    {
      key: "cost",
      header: "Custo",
      cell: (item) => formatCentsToBRL(item.costPriceCents),
      className: "text-right",
      headClassName: "text-right",
    },
    {
      key: "price",
      header: "Preço",
      cell: (item) => formatCentsToBRL(item.salePriceCents),
      className: "text-right",
      headClassName: "text-right",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatório de estoque"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {report.items.length} produtos
          </Badge>
        }
        description={`Saldo consolidado do estoque atual da loja ${store.displayName}, com exportação CSV e detalhamento por local.`}
        backHref="/reports"
        actions={
          <Button asChild>
            <Link href={buildStockExportHref(filters)}>
              <Download />
              Exportar CSV
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Busque por nome ou código e refine a visão por categoria, local e itens abaixo do mínimo."
      >
        <StockReportFilters
          currentSearch={filters.search}
          currentCategoryId={filters.categoryId}
          currentLocationId={filters.locationId}
          currentLowStock={filters.lowStock}
          categories={categories}
          locations={locations.filter((location) => location.active)}
        />
      </SectionCard>

      <SectionCard
        title="Estoque atual"
        description={`Atualizado em ${getTodayDateStringInTimeZone(store.timezone)}. ${lowStockCount} item(ns) abaixo do mínimo com os filtros atuais.`}
      >
        <DataTable
          columns={columns}
          data={report.items}
          getRowKey={(item) => item.id}
          getRowHref={(item) => `/products/${item.id}`}
          getRowClassName={(item) =>
            item.isBelowMin ? "bg-red-50/70 hover:bg-red-50/90" : undefined
          }
          emptyState={
            <EmptyState
              icon={Package}
              title="Nenhum produto encontrado."
              description="Ajuste os filtros para consultar outros saldos de estoque."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
