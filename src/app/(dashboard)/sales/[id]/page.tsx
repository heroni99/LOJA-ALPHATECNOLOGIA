import Link from "next/link"
import {
  ArrowRightLeft,
  BadgeDollarSign,
  Package,
  UserRound,
} from "lucide-react"
import { notFound } from "next/navigation"

import { SaleFiscalCard } from "@/components/fiscal/sale-fiscal-card"
import { SaleReturnDialog } from "@/components/sales/sale-return-dialog"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getFiscalDocumentBySaleId } from "@/lib/fiscal-server"
import {
  formatFinancialMoney,
  getFinancialPaymentMethodLabel,
} from "@/lib/financial"
import { formatCentsToBRL, formatDateTime } from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"
import { getSaleReturnRefundTypeLabel } from "@/lib/sale-returns"
import {
  type SaleDetailItem,
  type SaleDetailPayment,
  type SaleReturnHistoryEntry,
} from "@/lib/sales"
import { getSaleFullDetail } from "@/lib/sales-server"

type SaleDetailPageProps = {
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

const saleItemColumns: DataTableColumn<SaleDetailItem>[] = [
  {
    key: "product",
    header: "Produto",
    cell: (item) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">
          {item.internalCode} - {item.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.imeiOrSerial ?? "Sem IMEI/serial"}
        </span>
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "quantity",
    header: "Qtd.",
    cell: (item) => item.quantity,
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "returned",
    header: "Devolvido",
    cell: (item) => item.returnedQuantity,
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
    key: "total",
    header: "Subtotal",
    cell: (item) => formatCentsToBRL(item.totalPriceCents),
    className: "text-right",
    headClassName: "text-right",
  },
]

const paymentColumns: DataTableColumn<SaleDetailPayment>[] = [
  {
    key: "method",
    header: "Forma",
    cell: (payment) => getFinancialPaymentMethodLabel(payment.method),
  },
  {
    key: "installments",
    header: "Parcelas",
    cell: (payment) => payment.installments,
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "amount",
    header: "Valor",
    cell: (payment) => formatFinancialMoney(payment.amountCents),
    className: "text-right",
    headClassName: "text-right",
  },
]

const returnColumns: DataTableColumn<SaleReturnHistoryEntry>[] = [
  {
    key: "return_number",
    header: "Devolução",
    cell: (entry) => <span className="font-medium text-foreground">{entry.returnNumber}</span>,
  },
  {
    key: "refund_type",
    header: "Resolução",
    cell: (entry) => getSaleReturnRefundTypeLabel(entry.refundType),
  },
  {
    key: "reason",
    header: "Motivo",
    cell: (entry) => entry.reason,
    className: "whitespace-normal",
  },
  {
    key: "amount",
    header: "Total",
    cell: (entry) => formatFinancialMoney(entry.totalAmountCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "created_at",
    header: "Data",
    cell: (entry) => formatDateTime(entry.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const [sale, fiscalDocument] = await Promise.all([
    getSaleFullDetail(params.id, storeContext.storeId),
    getFiscalDocumentBySaleId(params.id, storeContext.storeId),
  ])

  if (!sale) {
    notFound()
  }

  const totalReturnedCents = sale.returns.reduce(
    (sum, entry) => sum + entry.totalAmountCents,
    0
  )
  const canReturn =
    !["CANCELLED", "REFUNDED"].includes(sale.status) &&
    sale.items.some((item) => item.availableReturnQuantity > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={sale.saleNumber}
        backHref="/sales"
        breadcrumbs={[
          { label: "Vendas", href: "/sales" },
          { label: sale.saleNumber },
        ]}
        titleSlot={
          <>
            {sale.customerName ? (
              <Badge variant="outline" className="border-primary/20 text-primary">
                {sale.customerName}
              </Badge>
            ) : null}
            <SaleStatusBadge status={sale.status} />
          </>
        }
        description="Consulte itens vendidos, pagamentos e devoluções registradas para esta venda."
        actions={
          <>
            <SaleReturnDialog
              saleId={sale.id}
              saleNumber={sale.saleNumber}
              items={sale.items}
              disabled={!canReturn}
            />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          title="Total da venda"
          value={formatCentsToBRL(sale.totalCents)}
          description="Valor final efetivamente cobrado do cliente."
          icon={<BadgeDollarSign className="size-5" />}
        />
        <StatCard
          title="Desconto"
          value={formatCentsToBRL(sale.discountAmountCents)}
          description="Desconto aplicado sobre o total da venda."
          icon={<BadgeDollarSign className="size-5" />}
        />
        <StatCard
          title="Itens vendidos"
          value={String(sale.items.length)}
          description="Quantidade de linhas registradas no checkout."
          icon={<Package className="size-5" />}
        />
        <StatCard
          title="Total devolvido"
          value={formatCentsToBRL(totalReturnedCents)}
          description="Soma das devoluções já lançadas para esta venda."
          icon={<ArrowRightLeft className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Cliente e operação"
          description="Resumo comercial da venda e identificação do atendimento."
          action={
            sale.customerId ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers/${sale.customerId}`}>Abrir cliente</Link>
              </Button>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Cliente" value={sale.customerName ?? "Consumidor final"} />
            <FieldValue label="Operador" value={sale.operatorName} />
            <FieldValue
              label="Concluída em"
              value={sale.completedAt ? formatDateTime(sale.completedAt) : null}
            />
            <FieldValue label="Criada em" value={formatDateTime(sale.createdAt)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Resumo de pagamentos"
          description="Formas utilizadas para liquidar a venda."
        >
          {sale.payments.length > 0 ? (
            <div className="space-y-3">
              {sale.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {getFinancialPaymentMethodLabel(payment.method)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.installments}{" "}
                      {payment.installments === 1 ? "parcela" : "parcelas"}
                    </p>
                  </div>
                  <strong className="text-foreground">
                    {formatFinancialMoney(payment.amountCents)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UserRound}
              title="Nenhum pagamento encontrado."
              description="As formas de pagamento registradas no checkout aparecerão aqui."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Comprovante fiscal"
        description="Gere, acompanhe o status e imprima o comprovante interno REC desta venda."
      >
        <SaleFiscalCard saleId={sale.id} fiscalDocument={fiscalDocument} />
      </SectionCard>

      <SectionCard
        title="Itens vendidos"
        description="Detalhamento dos produtos vendidos e saldo ainda disponível para devolução."
      >
        <DataTable
          columns={saleItemColumns}
          data={sale.items}
          getRowKey={(item) => item.id}
          emptyState={
            <EmptyState
              icon={Package}
              title="Nenhum item encontrado."
              description="Os itens desta venda serão exibidos aqui após o checkout."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          }
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pagamentos"
          description="Tabela consolidada das formas de pagamento registradas."
        >
          <DataTable
            columns={paymentColumns}
            data={sale.payments}
            getRowKey={(payment) => payment.id}
            emptyState={
              <EmptyState
                icon={BadgeDollarSign}
                title="Sem pagamentos registrados."
                description="As formas de pagamento aparecerão aqui quando a venda for concluída."
                className="min-h-56 rounded-none border-0 bg-transparent"
              />
            }
          />
        </SectionCard>

        <SectionCard
          title="Devoluções"
          description="Histórico das devoluções já realizadas para esta venda."
          action={
            canReturn ? (
              <SaleReturnDialog
                saleId={sale.id}
                saleNumber={sale.saleNumber}
                items={sale.items}
              />
            ) : null
          }
        >
          <DataTable
            columns={returnColumns}
            data={sale.returns}
            getRowKey={(entry) => entry.id}
            emptyState={
              <EmptyState
                icon={ArrowRightLeft}
                title="Nenhuma devolução registrada."
                description="Quando houver troca, crédito ou devolução em dinheiro, o histórico aparecerá aqui."
                className="min-h-56 rounded-none border-0 bg-transparent"
              />
            }
          />
        </SectionCard>
      </div>
    </div>
  )
}
