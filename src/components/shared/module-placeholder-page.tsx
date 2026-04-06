import { Cog } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"

type ModulePlaceholderPageProps = {
  title: string
  description: string
  badge: string
}

export function ModulePlaceholderPage({
  title,
  description,
  badge,
}: ModulePlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} badge={badge} />

      <SectionCard
        title="Módulo em preparação"
        description="Este espaço já está reservado no shell principal e pronto para receber o fluxo real."
      >
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/35 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Cog className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            {title} ainda sem regras de negócio conectadas.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            O shell, a navegação e a rota já estão prontos para evolução
            incremental deste módulo dentro do ERP/PDV.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
