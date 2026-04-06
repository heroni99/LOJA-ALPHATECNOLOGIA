import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock3,
  Receipt,
  Wallet,
} from "lucide-react"
import { notFound } from "next/navigation"

import { CashActions } from "@/components/cash/cash-actions"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  formatCentsToBRL,
  formatDateTime,
  formatElapsedTime,
  getCashMovementLabel,
  type CashMovement,
} from "@/lib/cash"
import { getCashDashboardData } from "@/lib/cash-server"
import { getCurrentStoreContext } from "@/lib/products-server"

const movementColumns: DataTableColumn<CashMovement>[] = [
  {
    key: "created_at",
    header: "Horário",
    cell: (movement) => formatDateTime(movement.createdAt),
  },
  {
    key: "movement_type",
    header: "Tipo",
    cell: (movement) => getCashMovementLabel(movement.movementType),
  },
  {
    key: "amount",
    header: "Valor",
    cell: (movement) => formatCentsToBRL(movement.amountCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "description",
    header: "Descrição",
    cell: (movement) => movement.description ?? "Sem descrição",
    className: "whitespace-normal",
  },
  {
    key: "user_name",
    header: "Responsável",
    cell: (movement) => movement.userName ?? "Operador",
  },
]

export default async function CashPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const { session, summary, movements } = await getCashDashboardData(
    storeContext.storeId,
    storeContext.userId
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Caixa"
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {session.terminalName}
            </Badge>
            <Badge variant="outline">Operador: {session.operatorName}</Badge>
            <Badge variant="outline">
              Abertura: {formatDateTime(session.openedAt)}
            </Badge>
            <Badge variant="outline">
              <Clock3 />
              {formatElapsedTime(session.openedAt)}
            </Badge>
          </>
        }
        description="A sessão atual é aberta automaticamente e mantém o caixa sempre disponível para operação."
        actions={<CashActions expectedAmountCents={summary.expectedAmountCents} />}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          title="Total vendas do dia"
          value={formatCentsToBRL(summary.totalSalesCents)}
          description="Total das vendas vinculadas à sessão atual."
          icon={<Receipt className="size-5" />}
        />
        <StatCard
          title="Qtd. vendas"
          value={summary.salesCount}
          description="Quantidade de vendas concluídas na sessão."
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          title="Suprimentos"
          value={formatCentsToBRL(summary.suppliesCents)}
          description="Entradas manuais de dinheiro no caixa."
          icon={<ArrowUpCircle className="size-5" />}
        />
        <StatCard
          title="Sangrias"
          value={formatCentsToBRL(summary.withdrawalsCents)}
          description="Retiradas manuais registradas na sessão."
          icon={<ArrowDownCircle className="size-5" />}
        />
      </div>

      <SectionCard
        title="Resumo operacional"
        description="Conferência rápida da sessão aberta e valor esperado em caixa."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Status
            </p>
            <p className="text-sm font-medium text-foreground">Aberto</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Valor de abertura
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatCentsToBRL(session.openingAmountCents)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Valor esperado
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatCentsToBRL(summary.expectedAmountCents)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Observações
            </p>
            <p className="text-sm text-foreground">
              {session.notes ?? "Sem observações"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Movimentos recentes"
        description="Últimos 20 lançamentos da sessão atual de caixa."
      >
        <DataTable
          columns={movementColumns}
          data={movements}
          getRowKey={(movement) => movement.id}
          emptyState={
            <EmptyState
              icon={Wallet}
              title="Sem movimentos de caixa."
              description="Assim que houver suprimentos, sangrias ou vendas vinculadas à sessão, elas aparecerão aqui."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
