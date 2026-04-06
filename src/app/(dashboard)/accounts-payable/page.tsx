import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
} from "lucide-react"
import { notFound } from "next/navigation"

import { AccountPayableCreateDialog } from "@/components/financial/account-payable-create-dialog"
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
  payableStatusSchema,
  type AccountPayableSummary,
} from "@/lib/financial"
import { listAccountsPayable } from "@/lib/financial-server"
import { getCurrentStoreContext } from "@/lib/products-server"
import { listPurchaseOrderSuppliers } from "@/lib/purchase-orders-server"

type AccountsPayablePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const payableColumns: DataTableColumn<AccountPayableSummary>[] = [
  {
    key: "description",
    header: "Descrição",
    cell: (account) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{account.description}</span>
        {account.purchaseOrderId ? (
          <Link
            href={`/purchase-orders/${account.purchaseOrderId}`}
            className="text-xs text-primary transition hover:text-primary/80"
          >
            Abrir pedido vinculado
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Lançamento avulso</span>
        )}
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "supplier",
    header: "Fornecedor",
    cell: (account) => account.supplierName ?? "Não informado",
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
      ["PAID", "CANCELLED"].includes(account.status) ? null : (
        <AccountSettlementDialog
          endpoint={`/api/accounts-payable/${account.id}/pay`}
          label="Pagar"
          title="Liquidar conta a pagar"
          description="Informe a data, a forma de pagamento e confirme a baixa integral do título."
          amountCents={account.amountCents}
        />
      ),
    className: "w-[140px]",
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

  return query ? `/accounts-payable?${query}` : "/accounts-payable"
}

export default async function AccountsPayablePage({
  searchParams = {},
}: AccountsPayablePageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getAccountFilters(searchParams, payableStatusSchema)
  const [accounts, suppliers] = await Promise.all([
    listAccountsPayable(storeContext.storeId, filters),
    listPurchaseOrderSuppliers(storeContext.storeId),
  ])

  const statusOptions = payableStatusSchema.options.map((status) => ({
    value: status,
    label: getAccountStatusLabel(status),
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas a pagar"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {accounts.totalCount} {accounts.totalCount === 1 ? "título" : "títulos"}
          </Badge>
        }
        description="Controle vencimentos, baixas e despesas vinculadas a compras ou lançamentos avulsos."
        actions={<AccountPayableCreateDialog suppliers={suppliers} />}
      />

      <SectionCard
        title="Filtros"
        description="Refine a listagem por status e período de vencimento."
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
        description="Marque contas como pagas diretamente na listagem."
      >
        <DataTable
          columns={payableColumns}
          data={accounts.items}
          getRowKey={(account) => account.id}
          getRowClassName={(account) =>
            account.isOverdue ? "bg-rose-50/60 dark:bg-rose-950/10" : null
          }
          emptyState={
            <EmptyState
              icon={ReceiptText}
              title="Nenhuma conta a pagar encontrada."
              description="Os compromissos financeiros vinculados a compras e despesas avulsas aparecerão aqui."
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
