import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
} from "lucide-react"
import { notFound } from "next/navigation"

import { InventoryFilters } from "@/components/inventory/inventory-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatQuantity,
  getInventoryListFilters,
  type InventoryBalanceRow,
} from "@/lib/inventory"
import { listInventoryBalances, listStockLocations } from "@/lib/inventory-server"
import {
  getCurrentStoreContext,
  listProductCategories,
} from "@/lib/products-server"

type InventoryPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getInventoryListFilters>
) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.locationId) {
    params.set("location_id", filters.locationId)
  }

  if (filters.categoryId) {
    params.set("category_id", filters.categoryId)
  }

  if (filters.lowStock) {
    params.set("low_stock", "true")
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/inventory?${query}` : "/inventory"
}

function StockStatusBadge({ lowStock }: { lowStock: boolean }) {
  return lowStock ? (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
      Abaixo do mínimo
    </Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
      OK
    </Badge>
  )
}

export default async function InventoryPage({
  searchParams = {},
}: InventoryPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getInventoryListFilters(searchParams)
  const [categories, locations, balances] = await Promise.all([
    listProductCategories(storeContext.storeId),
    listStockLocations(storeContext.storeId),
    listInventoryBalances(storeContext.storeId, filters),
  ])

  const quantityHeader = filters.locationId ? "Saldo no local" : "Estoque total"
  const inventoryColumns: DataTableColumn<InventoryBalanceRow>[] = [
    {
      key: "internal_code",
      header: "Código",
      cell: (row) => (
        <span className="font-medium text-foreground">{row.internalCode}</span>
      ),
    },
    {
      key: "name",
      header: "Nome",
      cell: (row) => row.productName,
      className: "whitespace-normal font-medium text-foreground",
    },
    {
      key: "category",
      header: "Categoria",
      cell: (row) => row.categoryName ?? "Sem categoria",
    },
    {
      key: "stock_total",
      header: quantityHeader,
      cell: (row) => formatQuantity(row.displayQuantity),
      className: "text-right font-semibold",
      headClassName: "text-right",
    },
    {
      key: "stock_min",
      header: "Mínimo",
      cell: (row) => formatQuantity(row.stockMin),
      className: "text-right",
      headClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StockStatusBadge lowStock={row.isBelowMin} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estoque"
        titleSlot={
          <Badge className="border-red-200 bg-red-50 text-red-700" variant="outline">
            <AlertTriangle />
            {balances.lowStockCount}{" "}
            {balances.lowStockCount === 1
              ? "produto abaixo do mínimo"
              : "produtos abaixo do mínimo"}
          </Badge>
        }
        subtitle="Acompanhe o saldo por produto e local, destaque itens críticos e navegue para ajustes e movimentações."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/inventory/movements">
                <ClipboardList />
                Movimentações
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/stock-locations">
                <MapPin />
                Locais
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/adjustment">
                <PackageCheck />
                Ajuste
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/transfer">
                <ArrowLeftRight />
                Transferência
              </Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/entry">
                <PackagePlus />
                Entrada
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard
        title="Filtros"
        description="Busque por nome ou código e refine por local, categoria e itens abaixo do mínimo."
      >
        <InventoryFilters
          locations={locations.filter((location) => location.active)}
          categories={categories}
          currentSearch={filters.search}
          currentLocationId={filters.locationId}
          currentCategoryId={filters.categoryId}
          currentLowStock={filters.lowStock}
        />
      </SectionCard>

      <SectionCard
        title="Saldos"
        description="Linhas em destaque indicam produtos com saldo abaixo do mínimo operacional."
      >
        <DataTable
          columns={inventoryColumns}
          data={balances.items}
          getRowKey={(row) => row.id}
          getRowHref={(row) => `/products/${row.id}`}
          getRowClassName={(row) =>
            row.isBelowMin ? "bg-red-50/70 hover:bg-red-50/90" : undefined
          }
          emptyState={
            <EmptyState
              icon={Package}
              title="Nenhum saldo encontrado."
              description="Ajuste os filtros ou registre uma entrada para começar a movimentar o estoque."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {balances.page} de {balances.totalPages}
          </p>
          <div className="flex gap-2">
            {balances.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(balances.page - 1, filters)}>
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
            {balances.page < balances.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(balances.page + 1, filters)}>
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
