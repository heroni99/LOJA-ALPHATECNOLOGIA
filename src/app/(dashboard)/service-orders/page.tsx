import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
} from "lucide-react"
import { notFound } from "next/navigation"

import { ServiceOrderStatusBadge } from "@/components/service-orders/service-order-status-badge"
import { ServiceOrdersFilters } from "@/components/service-orders/service-orders-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  buildServiceOrderDeviceLabel,
  getServiceOrderListFilters,
  type ServiceOrderSummary,
} from "@/lib/service-orders"
import { listServiceOrders } from "@/lib/service-orders-server"
import { formatDateTime } from "@/lib/products"

type ServiceOrdersPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const serviceOrderColumns: DataTableColumn<ServiceOrderSummary>[] = [
  {
    key: "order_number",
    header: "Número OS",
    cell: (serviceOrder) => (
      <span className="font-medium text-foreground">{serviceOrder.orderNumber}</span>
    ),
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (serviceOrder) => serviceOrder.customerName ?? "Cliente não encontrado",
    className: "whitespace-normal",
  },
  {
    key: "device",
    header: "Aparelho",
    cell: (serviceOrder) =>
      buildServiceOrderDeviceLabel({
        deviceType: serviceOrder.deviceType,
        brand: serviceOrder.brand,
        model: serviceOrder.model,
      }),
    className: "whitespace-normal",
  },
  {
    key: "technician",
    header: "Técnico",
    cell: (serviceOrder) => serviceOrder.technicianName ?? "Não atribuído",
  },
  {
    key: "status",
    header: "Status",
    cell: (serviceOrder) => (
      <ServiceOrderStatusBadge status={serviceOrder.status} />
    ),
  },
  {
    key: "created_at",
    header: "Data",
    cell: (serviceOrder) => formatDateTime(serviceOrder.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getServiceOrderListFilters>
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

  return query ? `/service-orders?${query}` : "/service-orders"
}

export default async function ServiceOrdersPage({
  searchParams = {},
}: ServiceOrdersPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getServiceOrderListFilters(searchParams)
  const serviceOrders = await listServiceOrders(storeContext.storeId, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ordens de serviço"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {serviceOrders.totalCount}{" "}
            {serviceOrders.totalCount === 1 ? "OS" : "OS"}
          </Badge>
        }
        description="Acompanhe diagnóstico, aprovação, execução e entrega das assistências técnicas em andamento."
        actions={
          <Button asChild>
            <Link href="/service-orders/new">
              <Plus />
              Nova OS
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por número da OS, cliente ou aparelho e refine pelo status atual."
      >
        <ServiceOrdersFilters
          currentSearch={filters.search}
          currentStatus={filters.status}
        />
      </SectionCard>

      <SectionCard
        title="Ordens registradas"
        description="Clique em uma linha para abrir o detalhe completo da ordem de serviço."
      >
        <DataTable
          columns={serviceOrderColumns}
          data={serviceOrders.items}
          getRowKey={(serviceOrder) => serviceOrder.id}
          getRowHref={(serviceOrder) => `/service-orders/${serviceOrder.id}`}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma OS encontrada."
              description="Ajuste os filtros ou abra uma nova ordem de serviço para começar."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {serviceOrders.page} de {serviceOrders.totalPages}
          </p>
          <div className="flex gap-2">
            {serviceOrders.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(serviceOrders.page - 1, filters)}>
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
            {serviceOrders.page < serviceOrders.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(serviceOrders.page + 1, filters)}>
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
