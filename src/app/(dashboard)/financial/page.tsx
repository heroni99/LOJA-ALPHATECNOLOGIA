import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Wallet,
} from "lucide-react"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { formatFinancialMoney } from "@/lib/financial"
import { getFinancialSummary } from "@/lib/financial-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function FinancialPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const summary = await getFinancialSummary(storeContext.storeId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financeiro"
        description="Acompanhe os totais a pagar e a receber, títulos vencidos e os próximos vencimentos operacionais."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/accounts-receivable">
                <ArrowUpCircle />
                Contas a receber
              </Link>
            </Button>
            <Button asChild>
              <Link href="/accounts-payable">
                <ArrowDownCircle />
                Contas a pagar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          title="A receber total"
          value={formatFinancialMoney(summary.receivableTotalCents)}
          description="Títulos em aberto vinculados a vendas e ordens de serviço."
          icon={<ArrowUpCircle className="size-5" />}
        />
        <StatCard
          title="A pagar total"
          value={formatFinancialMoney(summary.payableTotalCents)}
          description="Compromissos pendentes com fornecedores e despesas."
          icon={<ArrowDownCircle className="size-5" />}
        />
        <StatCard
          title="Vencidos a receber"
          value={formatFinancialMoney(summary.overdueReceivableCents)}
          description="Cobranças já vencidas sem baixa registrada."
          icon={<AlertTriangle className="size-5" />}
        />
        <StatCard
          title="Vencidos a pagar"
          value={formatFinancialMoney(summary.overduePayableCents)}
          description="Pagamentos em atraso que exigem atenção imediata."
          icon={<Wallet className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Próximos recebimentos"
          description="Títulos a receber com vencimento nos próximos 7 dias."
        >
          {summary.upcomingReceivables.length > 0 ? (
            <div className="space-y-3">
              {summary.upcomingReceivables.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.counterpartyName ?? "Sem cliente"} • {item.dueDate}
                    </p>
                  </div>
                  <strong className="text-foreground">
                    {formatFinancialMoney(item.amountCents)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Sem recebimentos próximos."
              description="Nenhum título a receber vence nos próximos sete dias."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Próximos pagamentos"
          description="Compromissos a pagar com vencimento nos próximos 7 dias."
        >
          {summary.upcomingPayables.length > 0 ? (
            <div className="space-y-3">
              {summary.upcomingPayables.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.counterpartyName ?? "Sem fornecedor"} • {item.dueDate}
                    </p>
                  </div>
                  <strong className="text-foreground">
                    {formatFinancialMoney(item.amountCents)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Sem pagamentos próximos."
              description="Nenhum compromisso a pagar vence nos próximos sete dias."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
