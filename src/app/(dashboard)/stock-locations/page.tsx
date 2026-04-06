import { MapPin } from "lucide-react"
import { notFound } from "next/navigation"

import { StockLocationsInlineForm } from "@/components/inventory/stock-locations-inline-form"
import { ActiveStatusBadge } from "@/components/shared/active-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import type { InventoryLocationOption } from "@/lib/inventory"
import { listStockLocations } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

const locationColumns: DataTableColumn<InventoryLocationOption>[] = [
  {
    key: "name",
    header: "Nome",
    cell: (location) => (
      <span className="font-medium text-foreground">{location.name}</span>
    ),
  },
  {
    key: "description",
    header: "Descrição",
    cell: (location) => location.description ?? "Sem descrição",
    className: "whitespace-normal",
  },
  {
    key: "default",
    header: "Padrão",
    cell: (location) =>
      location.isDefault ? (
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          Padrão
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Não</span>
      ),
  },
  {
    key: "active",
    header: "Ativo",
    cell: (location) => <ActiveStatusBadge active={location.active} />,
  },
]

export default async function StockLocationsPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const locations = await listStockLocations(storeContext.storeId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locais de estoque"
        description="Cadastre e mantenha os pontos físicos de armazenagem, separação e operação do estoque."
      />

      <SectionCard
        title="Novo local"
        description="Crie um novo local inline e, se necessário, defina-o como padrão da loja."
      >
        <StockLocationsInlineForm />
      </SectionCard>

      <SectionCard
        title="Locais cadastrados"
        description="Visualize os locais disponíveis para entradas, ajustes e transferências."
      >
        <DataTable
          columns={locationColumns}
          data={locations}
          getRowKey={(location) => location.id}
          emptyState={
            <EmptyState
              icon={MapPin}
              title="Nenhum local cadastrado."
              description="Cadastre o primeiro local para começar a organizar o estoque por posições."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
