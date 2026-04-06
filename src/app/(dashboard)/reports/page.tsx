import { BarChart3 } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Área pronta para concentrar visões analíticas quando os módulos começarem a gerar dados reais."
        badge="Análises"
      />

      <SectionCard
        title="Relatórios operacionais"
        description="Espaço previsto para faturamento, estoque, margem, performance e acompanhamento diário."
      >
        <EmptyState
          icon={BarChart3}
          title="Relatórios aguardando dados reais."
          description="A base está pronta para receber dashboards e exportações assim que vendas, estoque e caixa estiverem conectados."
          className="min-h-80"
        />
      </SectionCard>
    </div>
  )
}
