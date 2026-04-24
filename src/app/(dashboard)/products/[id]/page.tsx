import Link from "next/link"
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  Printer,
  Tag,
  Ticket,
} from "lucide-react"
import { notFound } from "next/navigation"

import { ProductAttachmentsPanel } from "@/components/products/product-attachments-panel"
import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatCentsToBRL,
  formatDateTime,
  formatQuantity,
  getStockMovementLabel,
  type ProductCode,
  type ProductMovement,
  type ProductStockBalance,
} from "@/lib/products"
import {
  getCurrentStoreContext,
  getProductFullDetail,
  listProductAttachments,
} from "@/lib/products-server"
import {
  PRODUCT_ATTACHMENTS_BUCKET,
  PRODUCT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
} from "@/lib/storage"
import { createSignedStorageUrl } from "@/lib/storage-server"

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

const codeColumns: DataTableColumn<ProductCode>[] = [
  {
    key: "type",
    header: "Tipo",
    cell: (code) => code.codeType,
  },
  {
    key: "code",
    header: "Código",
    cell: (code) => (
      <span className="font-medium text-foreground">{code.code}</span>
    ),
  },
  {
    key: "primary",
    header: "Primário?",
    cell: (code) =>
      code.isPrimary ? (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          Sim
        </Badge>
      ) : (
        <span className="text-muted-foreground">Não</span>
      ),
  },
]

const movementColumns: DataTableColumn<ProductMovement>[] = [
  {
    key: "created_at",
    header: "Data",
    cell: (movement) => formatDateTime(movement.createdAt),
  },
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
    key: "reference_type",
    header: "Referência",
    cell: (movement) => movement.referenceType ?? "Manual",
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

  const [detail, rawAttachments] = await Promise.all([
    getProductFullDetail(params.id, storeContext.storeId),
    listProductAttachments(params.id, storeContext.storeId),
  ])

  if (!detail) {
    notFound()
  }

  if (!rawAttachments) {
    notFound()
  }

  const attachments = await Promise.all(
    rawAttachments.map(async (attachment) => ({
      ...attachment,
      fileUrl: await createSignedStorageUrl(
        PRODUCT_ATTACHMENTS_BUCKET,
        attachment.fileUrl,
        PRODUCT_ATTACHMENT_SIGNED_URL_TTL_SECONDS
      ),
    }))
  )

  const { product, codes, stockBalances, recentMovements } = detail
  const stockVariant = product.isService
    ? "warning"
    : product.stockTotal < product.stockMin
      ? "danger"
      : "success"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name}
        backHref="/products"
        breadcrumbs={[
          { label: "Produtos", href: "/products" },
          { label: product.name },
        ]}
        titleSlot={
          <>
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
              {product.internalCode}
            </Badge>
            {product.categoryName ? (
              <Badge variant="outline">{product.categoryName}</Badge>
            ) : null}
            {product.isService ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                Serviço
              </Badge>
            ) : null}
            <ProductStatusBadge active={product.active} />
          </>
        }
        subtitle="Consulte preço, estoque, códigos cadastrados e as últimas movimentações do item."
        actions={
          <>
            <Button variant="outline" asChild>
              <a
                href={`/api/products/${product.id}/barcode`}
                target="_blank"
                rel="noreferrer"
              >
                <Printer />
                Imprimir etiqueta
              </a>
            </Button>
            <Button asChild>
              <Link href={`/products/${product.id}/edit`}>
                <Tag />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Estoque total"
          value={product.isService ? "N/A" : formatQuantity(product.stockTotal)}
          icon={<Boxes className="size-5" />}
          variant={stockVariant}
        />
        <StatCard
          label="Custo"
          value={formatCentsToBRL(product.costPriceCents)}
          icon={<BadgeDollarSign className="size-5" />}
        />
        <StatCard
          label="Preço venda"
          value={formatCentsToBRL(product.salePriceCents)}
          icon={<Ticket className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Identificação"
          description="Dados principais do cadastro e vínculo comercial."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Categoria" value={product.categoryName} />
            <FieldValue label="Fornecedor" value={product.supplierName} />
            <FieldValue label="Marca" value={product.brand} />
            <FieldValue label="Modelo" value={product.model} />
            <FieldValue label="Código fornecedor" value={product.supplierCode} />
            <FieldValue label="Descrição" value={product.description} />
          </div>
        </SectionCard>

        <SectionCard
          title="Fiscal"
          description="Campos fiscais e tributários configurados para o item."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="NCM" value={product.ncm} />
            <FieldValue label="CEST" value={product.cest} />
            <FieldValue label="CFOP padrão" value={product.cfopDefault} />
            <FieldValue label="Origem" value={product.originCode} />
            <FieldValue label="Categoria tributária" value={product.taxCategory} />
          </div>
        </SectionCard>
      </div>

      <Tabs defaultValue="stock" className="gap-4">
        <TabsList>
          <TabsTrigger value="stock">Estoque por local</TabsTrigger>
          <TabsTrigger value="codes">Códigos</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="attachments">Notas e documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <SectionCard
            title="Estoque por local"
            description="Distribuição atual do saldo nas localizações da loja."
          >
            <DataTable
              columns={stockColumns}
              data={stockBalances}
              getRowKey={(balance) => balance.id}
              emptyState={
                <EmptyState
                  icon={Boxes}
                  title={product.isService ? "Serviço sem estoque." : "Sem saldo registrado."}
                  description={
                    product.isService
                      ? "Serviços não controlam estoque físico."
                      : "Este produto ainda não possui posições registradas."
                  }
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="codes">
          <SectionCard
            title="Códigos"
            description="Lista dos códigos associados ao produto."
          >
            <DataTable
              columns={codeColumns}
              data={codes}
              getRowKey={(code) => code.id}
              emptyState={
                <EmptyState
                  icon={Ticket}
                  title="Nenhum código encontrado."
                  description="Os códigos gerados e cadastrados manualmente aparecerão aqui."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="movements">
          <SectionCard
            title="Movimentações"
            description="Últimos 20 movimentos de estoque vinculados ao produto."
          >
            <DataTable
              columns={movementColumns}
              data={recentMovements}
              getRowKey={(movement) => movement.id}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title={product.isService ? "Serviço sem movimentações." : "Nenhuma movimentação encontrada."}
                  description={
                    product.isService
                      ? "Serviços não geram movimentação física de estoque."
                      : "As entradas, saídas e ajustes mais recentes aparecerão aqui."
                  }
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="attachments">
          <SectionCard
            title="Notas e documentos"
            description="Anexe notas de compra, garantia, manual e outros documentos do produto."
          >
            <ProductAttachmentsPanel
              productId={product.id}
              initialAttachments={attachments}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
