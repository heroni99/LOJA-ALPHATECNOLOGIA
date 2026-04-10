import Link from "next/link"
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react"
import { notFound } from "next/navigation"

import { InventoryMovementsFilters } from "@/components/inventory/inventory-movements-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatQuantity,
  getInventoryMovementTypeLabel,
  getInventoryMovementsFilters,
  type InventoryMovement,
} from "@/lib/inventory"
import {
  getInventoryProductOptionById,
  listInventoryMovements,
  listStockLocations,
} from "@/lib/inventory-server"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"

type InventoryMovementsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getInventoryMovementsFilters>
) {
  const params = new URLSearchParams()

  if (filters.productId) {
    params.set("product_id", filters.productId)
  }

  if (filters.locationId) {
    params.set("location_id", filters.locationId)
  }

  if (filters.movementType) {
    params.set("type", filters.movementType)
  }

  if (filters.dateStart) {
    params.set("date_start", filters.dateStart)
  }

  if (filters.dateEnd) {
    params.set("date_end", filters.dateEnd)
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/inventory/movements?${query}` : "/inventory/movements"
}

function MovementTypeBadge({ type }: { type: string }) {
  const classes =
    {
      IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
      ADJUSTMENT_POSITIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
      TRANSFER_IN: "border-sky-200 bg-sky-50 text-sky-700",
      TRANSFER_OUT: "border-orange-200 bg-orange-50 text-orange-700",
      ADJUSTMENT_NEGATIVE: "border-red-200 bg-red-50 text-red-700",
      OUT: "border-red-200 bg-red-50 text-red-700",
      SALE: "border-red-200 bg-red-50 text-red-700",
      PURCHASE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }[type] ?? "border-border bg-muted text-foreground"

  return (
    <Badge variant="outline" className={classes}>
      {getInventoryMovementTypeLabel(type)}
    </Badge>
  )
}

const movementColumns: DataTableColumn<InventoryMovement>[] = [
  {
    key: "created_at",
    header: "Data / Hora",
    cell: (movement) => formatDateTime(movement.createdAt),
  },
  {
    key: "product",
    header: "Produto",
    cell: (movement) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">{movement.productName}</span>
        <span className="text-xs text-muted-foreground">{movement.internalCode}</span>
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "movement_type",
    header: "Tipo",
    cell: (movement) => <MovementTypeBadge type={movement.movementType} />,
  },
  {
    key: "location",
    header: "Local",
    cell: (movement) => movement.locationName ?? "Sem local",
  },
  {
    key: "quantity",
    header: "Quantidade",
    cell: (movement) => formatQuantity(movement.quantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "unit_cost",
    header: "Custo unit.",
    cell: (movement) =>
      movement.unitCostCents > 0 ? formatCentsToBRL(movement.unitCostCents) : "R$ 0,00",
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "user",
    header: "Usuário",
    cell: (movement) => movement.userName ?? "Sistema",
  },
]

export default async function InventoryMovementsPage({
  searchParams = {},
}: InventoryMovementsPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getInventoryMovementsFilters(searchParams)
  const [locations, movements, currentProduct] = await Promise.all([
    listStockLocations(storeContext.storeId),
    listInventoryMovements(storeContext.storeId, filters),
    filters.productId
      ? getInventoryProductOptionById(storeContext.storeId, filters.productId)
      : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Movimentações de estoque"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {movements.totalCount}{" "}
            {movements.totalCount === 1 ? "movimentação" : "movimentações"}
          </Badge>
        }
        subtitle="Consulte o histórico por produto, local, tipo e período."
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory">Voltar para saldos</Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Refine o histórico por produto, local, tipo e intervalo de datas."
      >
        <InventoryMovementsFilters
          locations={locations.filter((location) => location.active)}
          currentProductId={filters.productId}
          currentMovementType={filters.movementType}
          currentLocationId={filters.locationId}
          currentDateStart={filters.dateStart}
          currentDateEnd={filters.dateEnd}
          initialProduct={currentProduct}
        />
      </SectionCard>

      <SectionCard
        title="Histórico"
        description="Entradas, ajustes, transferências e demais eventos que alteraram o estoque."
      >
        <DataTable
          columns={movementColumns}
          data={movements.items}
          getRowKey={(movement) => movement.id}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma movimentação encontrada."
              description="Ajuste os filtros ou registre operações para popular o histórico."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {movements.page} de {movements.totalPages}
          </p>
          <div className="flex gap-2">
            {movements.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(movements.page - 1, filters)}>
                  <ChevronLeft />
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft className="mr-1 size-4" />
                Anterior
              </Button>
            )}
            {movements.page < movements.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(movements.page + 1, filters)}>
                  Próxima
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Próxima
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
