import Link from "next/link"
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  PencilLine,
  Tag,
} from "lucide-react"
import { notFound } from "next/navigation"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getCurrentStoreContext,
  getProductFullDetail,
} from "@/lib/products-server"
import {
  formatCentsToBRL,
  formatDateTime,
  formatQuantity,
  getStockMovementLabel,
  type ProductMovement,
  type ProductStockBalance,
} from "@/lib/products"

type ProductDetailPageProps = {
  params: {
    id: string
  }
}

const stockColumns: DataTableColumn<ProductStockBalance>[] = [
  {
    key: "location",
    header: "Local",
    cell: (balance) => balance.locationName ?? "Sem local",
  },
  {
    key: "quantity",
    header: "Quantidade",
    cell: (balance) => formatQuantity(balance.quantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "updated_at",
    header: "Atualizado em",
    cell: (balance) => formatDateTime(balance.updatedAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

const movementColumns: DataTableColumn<ProductMovement>[] = [
  {
    key: "movement_type",
    header: "Movimento",
    cell: (movement) => getStockMovementLabel(movement.movementType),
  },
  {
    key: "location",
    header: "Local",
    cell: (movement) => movement.locationName ?? "Sem local",
  },
  {
    key: "quantity",
    header: "Quantidade",
    cell: (movement) => formatQuantity(movement.quantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "unit_cost",
    header: "Custo unitário",
    cell: (movement) => formatCentsToBRL(movement.unitCostCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "reference_type",
    header: "Referência",
    cell: (movement) => movement.referenceType ?? "Manual",
  },
  {
    key: "created_at",
    header: "Data",
    cell: (movement) => formatDateTime(movement.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

function FieldValue({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value || "Não informado"}</p>
    </div>
  )
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const detail = await getProductFullDetail(params.id, storeContext.storeId)

  if (!detail) {
    notFound()
  }

  const { product, stockBalances, recentMovements } = detail

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name}
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {product.internalCode}
            </Badge>
            <ProductStatusBadge active={product.active} />
          </>
        }
        description="Visualize identificação, fiscal, preço e a movimentação recente deste item."
        actions={
          <Button asChild>
            <Link href={`/products/${product.id}/edit`}>
              <PencilLine />
              Editar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Estoque total"
          value={formatQuantity(product.totalStock)}
          description="Saldo consolidado em todos os locais."
          icon={<Boxes className="size-5" />}
        />
        <StatCard
          title="Custo"
          value={formatCentsToBRL(product.costPriceCents)}
          description="Valor persistido em centavos no banco."
          icon={<BadgeDollarSign className="size-5" />}
        />
        <StatCard
          title="Preço de venda"
          value={formatCentsToBRL(product.salePriceCents)}
          description="Preço atual do catálogo."
          icon={<Tag className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Identificação"
          description="Dados principais do cadastro e vínculo operacional."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Categoria" value={product.categoryName} />
            <FieldValue label="Fornecedor" value={product.supplierName} />
            <FieldValue label="Marca" value={product.brand} />
            <FieldValue label="Modelo" value={product.model} />
          </div>
        </SectionCard>

        <SectionCard
          title="Fiscal"
          description="Campos fiscais básicos do cadastro."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="NCM" value={product.ncm} />
            <FieldValue label="CEST" value={product.cest} />
            <FieldValue label="CFOP" value={product.cfopDefault} />
            <FieldValue label="Origem" value={product.originCode} />
          </div>
        </SectionCard>
      </div>

      <Tabs defaultValue="stock" className="gap-4">
        <TabsList>
          <TabsTrigger value="stock">Estoque por local</TabsTrigger>
          <TabsTrigger value="movements">Movimentações recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <SectionCard
            title="Estoque por local"
            description="Saldo atual do produto por localização."
          >
            <DataTable
              columns={stockColumns}
              data={stockBalances}
              getRowKey={(balance) => balance.id}
              emptyState={
                <EmptyState
                  icon={Boxes}
                  title="Sem saldo registrado."
                  description="Este produto ainda não tem posições de estoque registradas."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="movements">
          <SectionCard
            title="Movimentações recentes"
            description="Últimos eventos que afetaram o estoque deste produto."
          >
            <DataTable
              columns={movementColumns}
              data={recentMovements}
              getRowKey={(movement) => movement.id}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhuma movimentação encontrada."
                  description="As entradas, saídas e ajustes mais recentes aparecerão aqui."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
