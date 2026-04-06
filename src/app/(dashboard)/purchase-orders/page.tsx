import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
} from "lucide-react"
import { notFound } from "next/navigation"

import { PurchaseOrderStatusBadge } from "@/components/purchase-orders/purchase-order-status-badge"
import { PurchaseOrdersFilters } from "@/components/purchase-orders/purchase-orders-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  formatPurchaseOrderMoney,
  getPurchaseOrderListFilters,
  type PurchaseOrderSummary,
} from "@/lib/purchase-orders"
import { listPurchaseOrders } from "@/lib/purchase-orders-server"
import { formatDateTime } from "@/lib/products"

type PurchaseOrdersPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const purchaseOrderColumns: DataTableColumn<PurchaseOrderSummary>[] = [
  {
    key: "order_number",
    header: "Número",
    cell: (purchaseOrder) => (
      <span className="font-medium text-foreground">{purchaseOrder.orderNumber}</span>
    ),
  },
  {
    key: "supplier",
    header: "Fornecedor",
    cell: (purchaseOrder) => purchaseOrder.supplierName ?? "Fornecedor não encontrado",
    className: "whitespace-normal",
  },
  {
    key: "total",
    header: "Total",
    cell: (purchaseOrder) => formatPurchaseOrderMoney(purchaseOrder.totalCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "pending_items",
    header: "Pendências",
    cell: (purchaseOrder) =>
      `${purchaseOrder.pendingItems} ${purchaseOrder.pendingItems === 1 ? "item" : "itens"}`,
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (purchaseOrder) => (
      <PurchaseOrderStatusBadge status={purchaseOrder.status} />
    ),
  },
  {
    key: "ordered_at",
    header: "Emitido em",
    cell: (purchaseOrder) =>
      formatDateTime(purchaseOrder.orderedAt ?? purchaseOrder.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getPurchaseOrderListFilters>
) {
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

  return query ? `/purchase-orders?${query}` : "/purchase-orders"
}

export default async function PurchaseOrdersPage({
  searchParams = {},
}: PurchaseOrdersPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getPurchaseOrderListFilters(searchParams)
  const purchaseOrders = await listPurchaseOrders(storeContext.storeId, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos de compra"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {purchaseOrders.totalCount}{" "}
            {purchaseOrders.totalCount === 1 ? "pedido" : "pedidos"}
          </Badge>
        }
        description="Controle emissão, acompanhamento e recebimento de compras para reposição e abastecimento do estoque."
        actions={
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus />
              Novo pedido
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por número do pedido, fornecedor e refine pela etapa atual de recebimento."
      >
        <PurchaseOrdersFilters
          currentSearch={filters.search}
          currentStatus={filters.status}
        />
      </SectionCard>

      <SectionCard
        title="Pedidos registrados"
        description="Clique em uma linha para abrir o detalhe completo do pedido e registrar o recebimento."
      >
        <DataTable
          columns={purchaseOrderColumns}
          data={purchaseOrders.items}
          getRowKey={(purchaseOrder) => purchaseOrder.id}
          getRowHref={(purchaseOrder) => `/purchase-orders/${purchaseOrder.id}`}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="Nenhum pedido encontrado."
              description="Ajuste os filtros ou cadastre um novo pedido de compra para iniciar o abastecimento."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {purchaseOrders.page} de {purchaseOrders.totalPages}
          </p>
          <div className="flex gap-2">
            {purchaseOrders.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(purchaseOrders.page - 1, filters)}>
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
            {purchaseOrders.page < purchaseOrders.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(purchaseOrders.page + 1, filters)}>
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
