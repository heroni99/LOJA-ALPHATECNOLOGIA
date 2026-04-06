import { Activity, DollarSign, ShoppingCart, Wrench } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const dashboardMetrics = [
  {
    title: "Vendas do dia",
    description: "Resumo inicial do faturamento.",
    value: "0",
    icon: DollarSign,
  },
  {
    title: "Atendimentos PDV",
    description: "Movimento de balcão.",
    value: "0",
    icon: ShoppingCart,
  },
  {
    title: "OS em aberto",
    description: "Ordens aguardando evolução.",
    value: "0",
    icon: Wrench,
  },
  {
    title: "Alertas operacionais",
    description: "Pendências críticas do dia.",
    value: "0",
    icon: Activity,
  },
] as const

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Bem-vindo ao ALPHA TECNOLOGIA. Este painel inicial já reserva a estrutura para os indicadores principais da operação."
        badge="Operação"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => {
          const Icon = metric.icon

          return (
            <Card
              key={metric.title}
              className="border border-border/70 bg-white shadow-sm shadow-black/5"
              size="sm"
            >
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{metric.title}</CardTitle>
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
                <CardDescription>{metric.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SectionCard
        title="Bem-vindo ao ALPHA TECNOLOGIA"
        description="A operação autenticada já está pronta para crescer módulo por módulo."
      >
        <div className="rounded-3xl border border-dashed border-border bg-muted/35 p-6">
          <p className="text-base leading-relaxed text-foreground">
            O sistema já entrega navegação principal, shell responsivo e
            páginas reservadas para os fluxos centrais do ERP/PDV da loja.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Conforme os módulos forem evoluindo, este dashboard receberá dados
            reais de vendas, caixa, estoque, ordens de serviço e financeiro.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
