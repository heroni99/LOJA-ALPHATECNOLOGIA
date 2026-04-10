import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Truck } from "lucide-react"
import { notFound } from "next/navigation"

import { getCurrentStoreContext } from "@/lib/products-server"
import {
  SUPPLIERS_PAGE_SIZE,
  getSupplierListFilters,
  type SupplierSummary,
} from "@/lib/suppliers"
import { listSuppliers } from "@/lib/suppliers-server"
import { SuppliersFilters } from "@/components/suppliers/suppliers-filters"
import { ActiveStatusBadge } from "@/components/shared/active-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type SuppliersPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getSupplierListFilters>
) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.active !== null) {
    params.set("active", String(filters.active))
  }

  if (filters.limit !== SUPPLIERS_PAGE_SIZE) {
    params.set("limit", String(filters.limit))
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/suppliers?${query}` : "/suppliers"
}

const supplierColumns: DataTableColumn<SupplierSummary>[] = [
  {
    key: "name",
    header: "Nome",
    cell: (supplier) => <span className="font-medium text-foreground">{supplier.name}</span>,
    className: "whitespace-normal",
  },
  {
    key: "cnpj",
    header: "CNPJ",
    cell: (supplier) => supplier.cnpj ?? "Não informado",
  },
  {
    key: "phone",
    header: "Telefone",
    cell: (supplier) => supplier.phone ?? "Não informado",
  },
  {
    key: "city",
    header: "Cidade",
    cell: (supplier) => supplier.city ?? "Não informada",
  },
  {
    key: "status",
    header: "Status",
    cell: (supplier) => <ActiveStatusBadge active={supplier.active} />,
  },
]

export default async function SuppliersPage({
  searchParams = {},
}: SuppliersPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getSupplierListFilters(searchParams)
  const suppliers = await listSuppliers(storeContext.storeId, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fornecedores"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {suppliers.totalCount} {suppliers.totalCount === 1 ? "fornecedor" : "fornecedores"}
          </Badge>
        }
        description="Gerencie parceiros comerciais com busca rápida, status de cadastro e histórico de produtos e pedidos."
        actions={
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus />
              Novo fornecedor
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por nome, CNPJ ou telefone e refine a base pelo status do cadastro."
      >
        <SuppliersFilters
          currentSearch={filters.search}
          currentActive={filters.active}
        />
      </SectionCard>

      <SectionCard
        title="Base de fornecedores"
        description="Clique em um registro para abrir o detalhe completo do fornecedor."
      >
        <DataTable
          columns={supplierColumns}
          data={suppliers.items}
          getRowKey={(supplier) => supplier.id}
          getRowHref={(supplier) => `/suppliers/${supplier.id}`}
          emptyState={
            <EmptyState
              icon={Truck}
              title="Nenhum fornecedor encontrado."
              description="Ajuste os filtros ou cadastre um novo parceiro comercial."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {suppliers.page} de {suppliers.totalPages}
          </p>
          <div className="flex gap-2">
            {suppliers.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(suppliers.page - 1, filters)}>
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
            {suppliers.page < suppliers.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(suppliers.page + 1, filters)}>
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
