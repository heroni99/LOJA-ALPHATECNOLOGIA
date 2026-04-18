import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock3,
  Receipt,
  Wallet,
} from "lucide-react"
import { notFound } from "next/navigation"

import { CashActions } from "@/components/cash/cash-actions"
import { CashSessionElapsed } from "@/components/cash/cash-session-elapsed"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  formatCentsToBRL,
  formatDateTime,
  getCashMovementLabel,
  type CashMovement,
} from "@/lib/cash"
import { getCashDashboardData } from "@/lib/cash-server"
import { getCurrentStoreContext } from "@/lib/products-server"

type CashPageBlockingState = {
  title: string
  description: string
  hint: string
}

function getCashPageBlockingState(error: unknown): CashPageBlockingState | null {
  if (!(error instanceof Error)) {
    return null
  }

  if (error.message.includes("Nenhum terminal de caixa encontrado")) {
    return {
      title: "Nenhum terminal de caixa ativo.",
      description:
        "Ative ao menos um terminal de caixa para liberar a abertura automática da sessão, registrar movimentos e operar o PDV normalmente.",
      hint: "Cadastre ou ative um registro em cash_terminals.",
    }
  }

  if (error.message.includes("funções de caixa não estão instaladas no banco")) {
    return {
      title: "Módulo de caixa pendente no banco.",
      description:
        "O layout já está pronto, mas as funções SQL do caixa ainda não foram instaladas no banco desta loja. Sem isso, o sistema não consegue abrir sessões nem registrar movimentos.",
      hint: "Execute o script supabase/cash.sql no projeto Supabase.",
    }
  }

  return null
}

function CashMovementTypeBadge({ type }: { type: string }) {
  const classes =
    {
      OPENING: "border-slate-200 bg-slate-50 text-slate-700",
      SALE: "border-emerald-200 bg-emerald-50 text-emerald-700",
      SUPPLY: "border-sky-200 bg-sky-50 text-sky-700",
      WITHDRAWAL: "border-orange-200 bg-orange-50 text-orange-700",
      CLOSING: "border-violet-200 bg-violet-50 text-violet-700",
      REFUND: "border-rose-200 bg-rose-50 text-rose-700",
    }[type] ?? "border-border bg-muted text-foreground"

  return (
    <Badge variant="outline" className={classes}>
      {getCashMovementLabel(type)}
    </Badge>
  )
}

const movementColumns: DataTableColumn<CashMovement>[] = [
  {
    key: "created_at",
    header: "Data / Hora",
    cell: (movement) => formatDateTime(movement.createdAt),
  },
  {
    key: "movement_type",
    header: "Tipo",
    cell: (movement) => <CashMovementTypeBadge type={movement.movementType} />,
  },
  {
    key: "description",
    header: "Descrição",
    cell: (movement) => movement.description ?? "Sem descrição",
    className: "whitespace-normal",
  },
  {
    key: "amount",
    header: "Valor",
    cell: (movement) => formatCentsToBRL(movement.amountCents),
    className: "text-right font-medium",
    headClassName: "text-right",
  },
]

export default async function CashPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  try {
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
                Terminal ativo: {session.terminalName}
              </Badge>
              <Badge variant="outline">
                Operador: {session.operatorName || "Sistema"}
              </Badge>
              <Badge variant="outline">
                Abertura: {formatDateTime(session.openedAt)}
              </Badge>
              <Badge variant="outline">
                <Clock3 />
                <CashSessionElapsed openedAt={session.openedAt} />
              </Badge>
            </>
          }
          description="A sessão atual é aberta automaticamente e mantém o caixa sempre disponível para operação."
          actions={<CashActions expectedAmountCents={summary.expectedAmountCents} />}
        />

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard
            title="Vendas do dia"
            value={formatCentsToBRL(summary.totalSalesCents)}
            description="Soma dos movimentos do tipo venda na sessão atual."
            icon={<Receipt className="size-5" />}
          />
          <StatCard
            title="Qtd. de vendas"
            value={summary.salesCount}
            description="Quantidade de movimentos de venda na sessão atual."
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
          description="Últimos 30 lançamentos da sessão atual de caixa."
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
  } catch (error) {
    const blockingState = getCashPageBlockingState(error)

    if (!blockingState) {
      throw error
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Caixa"
          badge="Configuração pendente"
          description="O módulo de caixa precisa de uma configuração mínima antes de liberar a operação diária."
        />

        <SectionCard
          title="Operação bloqueada"
          description="O caixa automático depende de infraestrutura básica no banco antes de abrir sessões e registrar movimentos."
        >
          <EmptyState
            icon={AlertTriangle}
            title={blockingState.title}
            description={blockingState.description}
            hint={blockingState.hint}
            className="min-h-72"
          />
        </SectionCard>
      </div>
    )
  }
}
