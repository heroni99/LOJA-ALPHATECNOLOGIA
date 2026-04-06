import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  WalletCards,
} from "lucide-react"
import { notFound } from "next/navigation"

import { AccountSettlementDialog } from "@/components/financial/account-settlement-dialog"
import { AccountStatusBadge } from "@/components/financial/account-status-badge"
import { FinancialFilters } from "@/components/financial/financial-filters"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type AccountFilters,
  formatFinancialMoney,
  getAccountFilters,
  getAccountStatusLabel,
  getFinancialPaymentMethodLabel,
  receivableStatusSchema,
  type AccountReceivableSummary,
} from "@/lib/financial"
import { listAccountsReceivable } from "@/lib/financial-server"
import { getCurrentStoreContext } from "@/lib/products-server"

type AccountsReceivablePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const receivableColumns: DataTableColumn<AccountReceivableSummary>[] = [
  {
    key: "description",
    header: "Descrição",
    cell: (account) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{account.description}</span>
        {account.saleId ? (
          <Link
            href={`/sales/${account.saleId}`}
            className="text-xs text-primary transition hover:text-primary/80"
          >
            Abrir venda vinculada
          </Link>
        ) : account.serviceOrderId ? (
          <Link
            href={`/service-orders/${account.serviceOrderId}`}
            className="text-xs text-primary transition hover:text-primary/80"
          >
            Abrir OS vinculada
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Origem manual</span>
        )}
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (account) => account.customerName ?? "Não informado",
  },
  {
    key: "due_date",
    header: "Vencimento",
    cell: (account) => account.dueDate,
  },
  {
    key: "amount",
    header: "Valor",
    cell: (account) => formatFinancialMoney(account.amountCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (account) => (
      <AccountStatusBadge status={account.status} isOverdue={account.isOverdue} />
    ),
  },
  {
    key: "payment_method",
    header: "Forma",
    cell: (account) => getFinancialPaymentMethodLabel(account.paymentMethod),
  },
  {
    key: "actions",
    header: "Ações",
    cell: (account) =>
      ["RECEIVED", "CANCELLED"].includes(account.status) ? null : (
        <AccountSettlementDialog
          endpoint={`/api/accounts-receivable/${account.id}/receive`}
          label="Receber"
          title="Baixar conta a receber"
          description="Informe a data, a forma de recebimento e confirme a baixa integral do título."
          amountCents={account.amountCents}
        />
      ),
    className: "w-[160px]",
  },
]

function buildPageHref(
  page: number,
  filters: AccountFilters<string>
) {
  const params = new URLSearchParams()

  if (filters.status) {
    params.set("status", filters.status)
  }

  if (filters.dueFrom) {
    params.set("due_from", filters.dueFrom)
  }

  if (filters.dueTo) {
    params.set("due_to", filters.dueTo)
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/accounts-receivable?${query}` : "/accounts-receivable"
}

export default async function AccountsReceivablePage({
  searchParams = {},
}: AccountsReceivablePageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getAccountFilters(searchParams, receivableStatusSchema)
  const accounts = await listAccountsReceivable(storeContext.storeId, filters)
  const statusOptions = receivableStatusSchema.options.map((status) => ({
    value: status,
    label: getAccountStatusLabel(status),
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas a receber"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {accounts.totalCount} {accounts.totalCount === 1 ? "título" : "títulos"}
          </Badge>
        }
        description="Acompanhe cobranças abertas, títulos vencidos e registre baixas de recebimento."
      />

      <SectionCard
        title="Filtros"
        description="Refine a listagem por status e janela de vencimento."
      >
        <FinancialFilters
          currentStatus={filters.status}
          currentDueFrom={filters.dueFrom}
          currentDueTo={filters.dueTo}
          statuses={statusOptions}
        />
      </SectionCard>

      <SectionCard
        title="Títulos"
        description="Registre o recebimento integral diretamente na tabela."
      >
        <DataTable
          columns={receivableColumns}
          data={accounts.items}
          getRowKey={(account) => account.id}
          getRowClassName={(account) =>
            account.isOverdue ? "bg-rose-50/60 dark:bg-rose-950/10" : null
          }
          emptyState={
            <EmptyState
              icon={WalletCards}
              title="Nenhuma conta a receber encontrada."
              description="As cobranças geradas por vendas e serviços aparecerão aqui."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {accounts.page} de {accounts.totalPages}
          </p>
          <div className="flex gap-2">
            {accounts.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(accounts.page - 1, filters)}>
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
            {accounts.page < accounts.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(accounts.page + 1, filters)}>
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
