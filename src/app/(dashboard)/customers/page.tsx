import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react"
import { notFound } from "next/navigation"

import {
  CUSTOMERS_PAGE_SIZE,
  CustomerSummary,
  getCustomerListFilters,
} from "@/lib/customers"
import { listCustomers } from "@/lib/customers-server"
import { getCurrentStoreContext } from "@/lib/products-server"
import { CustomersFilters } from "@/components/customers/customers-filters"
import { ActiveStatusBadge } from "@/components/shared/active-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type CustomersPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getCustomerListFilters>
) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.active !== null) {
    params.set("active", String(filters.active))
  }

  if (filters.limit !== CUSTOMERS_PAGE_SIZE) {
    params.set("limit", String(filters.limit))
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/customers?${query}` : "/customers"
}

const customerColumns: DataTableColumn<CustomerSummary>[] = [
  {
    key: "name",
    header: "Nome",
    cell: (customer) => <span className="font-medium text-foreground">{customer.name}</span>,
    className: "whitespace-normal",
  },
  {
    key: "phone",
    header: "Telefone",
    cell: (customer) => customer.phone ?? "Não informado",
  },
  {
    key: "cpf_cnpj",
    header: "CPF/CNPJ",
    cell: (customer) => customer.cpfCnpj ?? "Não informado",
  },
  {
    key: "city_state",
    header: "Cidade / UF",
    cell: (customer) =>
      customer.city || customer.state
        ? [customer.city, customer.state].filter(Boolean).join(" / ")
        : "Não informada",
  },
  {
    key: "status",
    header: "Status",
    cell: (customer) => <ActiveStatusBadge active={customer.active} />,
  },
]

export default async function CustomersPage({
  searchParams = {},
}: CustomersPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getCustomerListFilters(searchParams)
  const customers = await listCustomers(storeContext.storeId, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {customers.totalCount} {customers.totalCount === 1 ? "cliente" : "clientes"}
          </Badge>
        }
        description="Gerencie o relacionamento operacional com busca rápida, status de cadastro e acesso ao histórico comercial do cliente."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus />
              Novo cliente
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por nome, telefone ou documento e refine a base pelo status do cadastro."
      >
        <CustomersFilters
          currentSearch={filters.search}
          currentActive={filters.active}
        />
      </SectionCard>

      <SectionCard
        title="Base de clientes"
        description="Clique em um registro para abrir o detalhe completo do cliente."
      >
        <DataTable
          columns={customerColumns}
          data={customers.items}
          getRowKey={(customer) => customer.id}
          getRowHref={(customer) => `/customers/${customer.id}`}
          emptyState={
            <EmptyState
              icon={Users}
              title="Nenhum cliente encontrado."
              description="Ajuste os filtros ou cadastre um novo cliente para começar a base."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {customers.page} de {customers.totalPages}
          </p>
          <div className="flex gap-2">
            {customers.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(customers.page - 1, filters)}>
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
            {customers.page < customers.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(customers.page + 1, filters)}>
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
