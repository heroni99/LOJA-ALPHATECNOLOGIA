import Link from "next/link"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  formatLocationBalanceSummary,
  formatQuantity,
  getInventoryListFilters,
  getVisibleLocationBalances,
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

  if (filters.locationId) {
    params.set("location_id", filters.locationId)
  }

  if (filters.categoryId) {
    params.set("category_id", filters.categoryId)
  }

  if (filters.belowMin) {
    params.set("below_min", "true")
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/inventory?${query}` : "/inventory"
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

  const locationNameById = new Map(
    locations.map((location) => [location.id, location.name])
  )

  const inventoryColumns: DataTableColumn<InventoryBalanceRow>[] = [
    {
      key: "internal_code",
      header: "Código",
      cell: (row) => (
        <span className="font-medium text-foreground">{row.internalCode}</span>
      ),
    },
    {
      key: "product",
      header: "Produto",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.productName}</span>
          <span className="text-xs text-muted-foreground">
            {row.categoryName ?? "Sem categoria"}
          </span>
        </div>
      ),
      className: "whitespace-normal",
    },
    {
      key: "category",
      header: "Categoria",
      cell: (row) => row.categoryName ?? "Sem categoria",
    },
    {
      key: "balances",
      header: "Saldo por local",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatLocationBalanceSummary(
            getVisibleLocationBalances(row, filters.locationId, locationNameById)
          )}
        </span>
      ),
      className: "whitespace-normal",
    },
    {
      key: "minimum",
      header: "Mínimo",
      cell: (row) => formatQuantity(row.stockMin),
      className: "text-right",
      headClassName: "text-right",
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
              ? "item abaixo do mínimo"
              : "itens abaixo do mínimo"}
          </Badge>
        }
        description="Acompanhe o saldo consolidado por produto, filtre por local ou categoria e destaque rapidamente os itens abaixo do estoque mínimo."
        actions={
          <>
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
                <Package />
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
        description="Refine a visão por local, categoria e itens abaixo do mínimo operacional."
      >
        <InventoryFilters
          locations={locations}
          categories={categories}
          currentLocationId={filters.locationId}
          currentCategoryId={filters.categoryId}
          currentBelowMin={filters.belowMin}
        />
      </SectionCard>

      <SectionCard
        title="Saldos por produto"
        description="Linhas em destaque indicam produtos com saldo consolidado abaixo do mínimo definido no cadastro."
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
