import { Settings } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Ponto de partida para parâmetros do sistema, preferências da loja e integrações."
        badge="Sistema"
      />

      <SectionCard
        title="Parâmetros gerais"
        description="Estrutura inicial para preferências operacionais, fiscais e administrativas."
      >
        <EmptyState
          icon={Settings}
          title="Configurações ainda não definidas."
          description="Quando este módulo evoluir, aqui ficarão dados da loja, usuários, permissões, integrações e opções de operação."
          className="min-h-80"
        />
      </SectionCard>
    </div>
  )
}
