import Link from "next/link"
import { Boxes, ClipboardList, PencilLine, ShoppingBag, Truck } from "lucide-react"
import { notFound } from "next/navigation"

import { ActiveStatusBadge } from "@/components/shared/active-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentStoreContext } from "@/lib/products-server"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"
import {
  type SupplierProduct,
  type SupplierPurchaseOrder,
} from "@/lib/suppliers"
import { getSupplierFullDetail } from "@/lib/suppliers-server"
import { humanizeEnumValue } from "@/lib/utils"

type SupplierDetailPageProps = {
  params: {
    id: string
  }
}

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

const productColumns: DataTableColumn<SupplierProduct>[] = [
  {
    key: "internal_code",
    header: "Código",
    cell: (product) => product.internalCode,
  },
  {
    key: "name",
    header: "Produto",
    cell: (product) => product.name,
    className: "whitespace-normal",
  },
  {
    key: "sale_price",
    header: "Preço venda",
    cell: (product) => formatCentsToBRL(product.salePriceCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (product) => <ActiveStatusBadge active={product.active} />,
  },
]

const purchaseOrderColumns: DataTableColumn<SupplierPurchaseOrder>[] = [
  {
    key: "order_number",
    header: "Pedido",
    cell: (purchaseOrder) => purchaseOrder.orderNumber,
  },
  {
    key: "status",
    header: "Status",
    cell: (purchaseOrder) => humanizeEnumValue(purchaseOrder.status),
  },
  {
    key: "total",
    header: "Total",
    cell: (purchaseOrder) => formatCentsToBRL(purchaseOrder.totalCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "ordered_at",
    header: "Data",
    cell: (purchaseOrder) => formatDateTime(purchaseOrder.orderedAt ?? purchaseOrder.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const detail = await getSupplierFullDetail(params.id, storeContext.storeId)

  if (!detail) {
    notFound()
  }

  const { supplier, products, purchaseOrders } = detail

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={supplier.name}
        titleSlot={<ActiveStatusBadge active={supplier.active} />}
        description="Consulte o cadastro do fornecedor, produtos vinculados e o histórico de pedidos de compra."
        actions={
          <Button asChild>
            <Link href={`/suppliers/${supplier.id}/edit`}>
              <PencilLine />
              Editar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Produtos vinculados"
          value={String(products.length)}
          description="Itens do catálogo associados a este fornecedor."
          icon={<Boxes className="size-5" />}
        />
        <StatCard
          title="Pedidos de compra"
          value={String(purchaseOrders.length)}
          description="Pedidos recentes vinculados ao fornecedor."
          icon={<ShoppingBag className="size-5" />}
        />
        <StatCard
          title="Contato principal"
          value={supplier.contactName ?? supplier.phone ?? "N/A"}
          description="Ponto de contato atual do parceiro comercial."
          icon={<Truck className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Dados cadastrais"
          description="Campos principais do parceiro comercial."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Nome" value={supplier.name} />
            <FieldValue label="Razão social" value={supplier.tradeName} />
            <FieldValue label="CNPJ" value={supplier.cnpj} />
            <FieldValue label="Contato" value={supplier.contactName} />
            <FieldValue label="Telefone" value={supplier.phone} />
            <FieldValue label="E-mail" value={supplier.email} />
          </div>
        </SectionCard>

        <SectionCard
          title="Endereço"
          description="Localização e endereço cadastral."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="CEP" value={supplier.zipCode} />
            <FieldValue label="Cidade" value={supplier.city} />
            <FieldValue label="Estado" value={supplier.state} />
            <FieldValue label="Endereço" value={supplier.address} />
          </div>
        </SectionCard>
      </div>

      {supplier.notes ? (
        <SectionCard
          title="Observações"
          description="Contexto adicional registrado pela equipe."
        >
          <p className="text-sm leading-relaxed text-foreground">{supplier.notes}</p>
        </SectionCard>
      ) : null}

      <Tabs defaultValue="products" className="gap-4">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <SectionCard
            title="Produtos do fornecedor"
            description="Itens do catálogo vinculados a este parceiro."
          >
            <DataTable
              columns={productColumns}
              data={products}
              getRowKey={(product) => product.id}
              getRowHref={(product) => `/products/${product.id}`}
              emptyState={
                <EmptyState
                  icon={Boxes}
                  title="Nenhum produto vinculado."
                  description="Os produtos ligados a este fornecedor aparecerão aqui."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="orders">
          <SectionCard
            title="Pedidos de compra"
            description="Histórico recente de pedidos de compra deste fornecedor."
          >
            <DataTable
              columns={purchaseOrderColumns}
              data={purchaseOrders}
              getRowKey={(purchaseOrder) => purchaseOrder.id}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum pedido encontrado."
                  description="Os pedidos de compra vinculados a este fornecedor aparecerão aqui."
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
