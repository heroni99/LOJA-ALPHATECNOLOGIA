import Link from "next/link"
import {
  ClipboardList,
  PackageOpen,
  Printer,
  WalletCards,
} from "lucide-react"
import { notFound } from "next/navigation"

import { ServiceOrderActions } from "@/components/service-orders/service-order-actions"
import { ServiceOrderAddItemDialog } from "@/components/service-orders/service-order-add-item-dialog"
import { ServiceOrderAttachments } from "@/components/service-orders/service-order-attachments"
import { ServiceOrderStatusBadge } from "@/components/service-orders/service-order-status-badge"
import { ServiceOrderStatusSteps } from "@/components/service-orders/service-order-status-steps"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  buildServiceOrderDeviceLabel,
  formatServiceOrderDate,
  formatServiceOrderQuantity,
  getServiceOrderStatusLabel,
  type ServiceOrderHistoryEntry,
  type ServiceOrderItem,
} from "@/lib/service-orders"
import { getServiceOrderFullDetail } from "@/lib/service-orders-server"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"

type ServiceOrderDetailPageProps = {
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

const itemColumns: DataTableColumn<ServiceOrderItem>[] = [
  {
    key: "description",
    header: "Peça",
    cell: (item) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{item.description}</span>
        <span className="text-xs text-muted-foreground">
          {item.internalCode ?? "Sem código"}
        </span>
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "quantity",
    header: "Quantidade",
    cell: (item) => formatServiceOrderQuantity(item.quantity),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "unit_price",
    header: "Valor unitário",
    cell: (item) => formatCentsToBRL(item.unitPriceCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "total_price",
    header: "Total",
    cell: (item) => formatCentsToBRL(item.totalPriceCents),
    className: "text-right",
    headClassName: "text-right",
  },
]

function HistoryTimeline({ history }: { history: ServiceOrderHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sem eventos no histórico."
        description="As mudanças de status da OS aparecerão aqui."
        className="min-h-56 rounded-none border-0 bg-transparent"
      />
    )
  }

  return (
    <ol className="space-y-4">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="relative pl-6 before:absolute before:left-1.5 before:top-2 before:h-full before:w-px before:bg-border last:before:hidden"
        >
          <span className="absolute left-0 top-1.5 size-3 rounded-full bg-primary" />
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {getServiceOrderStatusLabel(entry.newStatus)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
            {entry.oldStatus ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Alterado de {getServiceOrderStatusLabel(entry.oldStatus)} para{" "}
                {getServiceOrderStatusLabel(entry.newStatus)}.
              </p>
            ) : null}
            {entry.notes ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {entry.notes}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Responsável: {entry.changedByName ?? "Equipe técnica"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default async function ServiceOrderDetailPage({
  params,
}: ServiceOrderDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const detail = await getServiceOrderFullDetail(params.id, storeContext.storeId)

  if (!detail) {
    notFound()
  }

  const isClosed = ["DELIVERED", "REJECTED", "CANCELLED"].includes(detail.status)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={detail.orderNumber}
        backHref="/service-orders"
        breadcrumbs={[
          { label: "Ordens de serviço", href: "/service-orders" },
          { label: detail.orderNumber },
        ]}
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {buildServiceOrderDeviceLabel(detail)}
            </Badge>
            <ServiceOrderStatusBadge status={detail.status} />
          </>
        }
        description={`Cliente ${detail.customer?.name ?? "não encontrado"} • Técnico ${detail.assignedToName ?? "não atribuído"}`}
        actions={
          <>
            <ServiceOrderActions serviceOrder={detail} />
            <Button variant="outline" asChild>
              <Link href={`/api/service-orders/${detail.id}/receipt`} target="_blank">
                <Printer />
                Imprimir OS
              </Link>
            </Button>
          </>
        }
      />

      <ServiceOrderStatusSteps status={detail.status} />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Orçamento"
          value={formatCentsToBRL(detail.totalEstimatedCents)}
          description="Valor estimado atual da ordem de serviço."
          icon={<WalletCards className="size-5" />}
        />
        <StatCard
          title="Total final"
          value={formatCentsToBRL(detail.totalFinalCents)}
          description="Valor final acumulado da OS."
          icon={<WalletCards className="size-5" />}
        />
        <StatCard
          title="Peças lançadas"
          value={String(detail.items.length)}
          description="Itens consumidos e vinculados à assistência."
          icon={<PackageOpen className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Aparelho"
          description="Identificação completa do equipamento em atendimento."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Tipo" value={detail.deviceType} />
            <FieldValue label="Marca" value={detail.brand} />
            <FieldValue label="Modelo" value={detail.model} />
            <FieldValue label="Cor" value={detail.color} />
            <FieldValue label="IMEI" value={detail.imei} />
            <FieldValue label="Serial" value={detail.serialNumber} />
            <FieldValue label="Acessórios" value={detail.accessories} />
            <FieldValue
              label="Prazo estimado"
              value={formatServiceOrderDate(detail.estimatedCompletionDate)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Cliente"
          description="Dados principais do cliente e navegação para o cadastro."
          action={
            detail.customer ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers/${detail.customer.id}`}>Abrir cliente</Link>
              </Button>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Nome" value={detail.customer?.name ?? null} />
            <FieldValue label="Telefone" value={detail.customer?.phone ?? null} />
            <FieldValue label="E-mail" value={detail.customer?.email ?? null} />
            <FieldValue label="CPF/CNPJ" value={detail.customer?.cpfCnpj ?? null} />
            <FieldValue label="Cidade" value={detail.customer?.city ?? null} />
            <FieldValue label="Estado" value={detail.customer?.state ?? null} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Atendimento técnico"
        description="Relato inicial do cliente, diagnóstico encontrado e observações da equipe."
      >
        <div className="grid gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Problema relatado
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {detail.reportedIssue}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Diagnóstico encontrado
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {detail.foundIssue ?? "Aguardando diagnóstico."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Criada por" value={detail.createdByName} />
            <FieldValue label="Técnico" value={detail.assignedToName} />
            <FieldValue
              label="Aprovada em"
              value={detail.approvedAt ? formatDateTime(detail.approvedAt) : "Não informado"}
            />
            <FieldValue
              label="Entregue em"
              value={detail.deliveredAt ? formatDateTime(detail.deliveredAt) : "Não informado"}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Notas técnicas
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {detail.technicalNotes ?? "Sem observações técnicas."}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Anexos"
        description="Fotos do aparelho, laudos e documentos complementares desta ordem de serviço."
      >
        <ServiceOrderAttachments
          serviceOrderId={detail.id}
          initialAttachments={detail.attachments}
        />
      </SectionCard>

      <SectionCard
        title="Peças"
        description="Itens consumidos no reparo e respectivas baixas de estoque."
        action={
          <ServiceOrderAddItemDialog
            serviceOrderId={detail.id}
            disabled={isClosed}
          />
        }
      >
        <DataTable
          columns={itemColumns}
          data={detail.items}
          getRowKey={(item) => item.id}
          emptyState={
            <EmptyState
              icon={PackageOpen}
              title="Nenhuma peça lançada."
              description="Use o botão acima para adicionar peças consumidas no reparo."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>

      <SectionCard
        title="Histórico de status"
        description="Linha do tempo das mudanças de etapa desta ordem de serviço."
      >
        <HistoryTimeline history={detail.history} />
      </SectionCard>
    </div>
  )
}
