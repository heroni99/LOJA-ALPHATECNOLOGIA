import Link from "next/link"
import {
  Boxes,
  CheckCheck,
  ClipboardList,
  Download,
  PencilLine,
} from "lucide-react"
import { notFound } from "next/navigation"

import { PurchaseOrderReceiveDialog } from "@/components/purchase-orders/purchase-order-receive-dialog"
import { PurchaseOrderStatusBadge } from "@/components/purchase-orders/purchase-order-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  formatPurchaseOrderMoney,
  formatPurchaseOrderQuantity,
  type PurchaseOrderItemSummary,
} from "@/lib/purchase-orders"
import { getPurchaseOrderFullDetail } from "@/lib/purchase-orders-server"
import { formatDateTime } from "@/lib/products"

type PurchaseOrderDetailPageProps = {
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

const itemColumns: DataTableColumn<PurchaseOrderItemSummary>[] = [
  {
    key: "description",
    header: "Item",
    cell: (item) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{item.description}</span>
        <span className="text-xs text-muted-foreground">
          {item.internalCode ?? "Sem código interno"}
        </span>
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "quantity",
    header: "Solicitado",
    cell: (item) => formatPurchaseOrderQuantity(item.quantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "received",
    header: "Recebido",
    cell: (item) => formatPurchaseOrderQuantity(item.receivedQuantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "remaining",
    header: "Pendente",
    cell: (item) => formatPurchaseOrderQuantity(item.remainingQuantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "unit_cost",
    header: "Custo unitário",
    cell: (item) => formatPurchaseOrderMoney(item.unitCostCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "total_cost",
    header: "Subtotal",
    cell: (item) => formatPurchaseOrderMoney(item.totalCostCents),
    className: "text-right",
    headClassName: "text-right",
  },
]

export default async function PurchaseOrderDetailPage({
  params,
}: PurchaseOrderDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const purchaseOrder = await getPurchaseOrderFullDetail(params.id, storeContext.storeId)

  if (!purchaseOrder) {
    notFound()
  }

  const pendingItems = purchaseOrder.items.filter((item) => item.remainingQuantity > 0)
  const totalRequested = purchaseOrder.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )
  const totalReceived = purchaseOrder.items.reduce(
    (sum, item) => sum + item.receivedQuantity,
    0
  )
  const canEdit = !["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(
    purchaseOrder.status
  )
  const canReceive =
    !["RECEIVED", "CANCELLED"].includes(purchaseOrder.status) &&
    pendingItems.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={purchaseOrder.orderNumber}
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {purchaseOrder.supplierName ?? "Fornecedor"}
            </Badge>
            <PurchaseOrderStatusBadge status={purchaseOrder.status} />
          </>
        }
        description="Visualize os itens solicitados, quantidades já recebidas e o vínculo financeiro gerado no recebimento."
        actions={
          <>
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link href={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <PencilLine />
                  Editar
                </Link>
              </Button>
            ) : null}
            <PurchaseOrderReceiveDialog
              purchaseOrderId={purchaseOrder.id}
              items={pendingItems}
              disabled={!canReceive}
            />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Valor do pedido"
          value={formatPurchaseOrderMoney(purchaseOrder.totalCents)}
          description="Total planejado para este pedido de compra."
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          title="Quantidade solicitada"
          value={formatPurchaseOrderQuantity(totalRequested)}
          description="Soma das quantidades de todos os itens."
          icon={<Boxes className="size-5" />}
        />
        <StatCard
          title="Quantidade recebida"
          value={formatPurchaseOrderQuantity(totalReceived)}
          description="Total já conferido e incorporado ao estoque."
          icon={<CheckCheck className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Resumo"
          description="Dados cadastrais, emissão e observações do pedido."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/suppliers/${purchaseOrder.supplierId}`}>Abrir fornecedor</Link>
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Fornecedor" value={purchaseOrder.supplierName} />
            <FieldValue
              label="Emitido em"
              value={purchaseOrder.orderedAt ? formatDateTime(purchaseOrder.orderedAt) : null}
            />
            <FieldValue
              label="Recebido em"
              value={
                purchaseOrder.receivedAt ? formatDateTime(purchaseOrder.receivedAt) : null
              }
            />
            <FieldValue
              label="Atualizado em"
              value={formatDateTime(purchaseOrder.updatedAt)}
            />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Observações
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {purchaseOrder.notes || "Sem observações adicionais."}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Recebimento"
          description="Itens ainda pendentes e orientação para conferência."
          action={
            canReceive ? (
              <PurchaseOrderReceiveDialog
                purchaseOrderId={purchaseOrder.id}
                items={pendingItems}
              />
            ) : null
          }
        >
          {pendingItems.length > 0 ? (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <p className="font-medium text-foreground">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Pendente: {formatPurchaseOrderQuantity(item.remainingQuantity)} •
                    Custo: {formatPurchaseOrderMoney(item.unitCostCents)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Download}
              title="Sem pendências de recebimento."
              description="Todos os itens deste pedido já foram conferidos ou o pedido foi encerrado."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Itens do pedido"
        description="Lista completa dos produtos, custos e quantidades solicitadas para o pedido."
      >
        <DataTable
          columns={itemColumns}
          data={purchaseOrder.items}
          getRowKey={(item) => item.id}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="Nenhum item no pedido."
              description="Adicione itens ao pedido para acompanhar a compra e o recebimento."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>
    </div>
  )
}
