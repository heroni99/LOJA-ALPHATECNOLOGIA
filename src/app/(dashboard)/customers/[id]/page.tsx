import Link from "next/link"
import {
  BadgeDollarSign,
  CreditCard,
  PackageSearch,
  PencilLine,
  ShieldCheck,
} from "lucide-react"
import { notFound } from "next/navigation"

import { DeactivateRecordButton } from "@/components/shared/deactivate-record-button"
import { ActiveStatusBadge } from "@/components/shared/active-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CustomerReceivable,
  CustomerSale,
  CustomerServiceOrder,
} from "@/lib/customers"
import { getCustomerFullDetail } from "@/lib/customers-server"
import {
  formatCentsToBRL,
  formatDateTime,
} from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"
import { humanizeEnumValue } from "@/lib/utils"

type CustomerDetailPageProps = {
  params: {
    id: string
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value))
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

const salesColumns: DataTableColumn<CustomerSale>[] = [
  {
    key: "sale_number",
    header: "Venda",
    cell: (sale) => sale.saleNumber,
  },
  {
    key: "status",
    header: "Status",
    cell: (sale) => humanizeEnumValue(sale.status),
  },
  {
    key: "total",
    header: "Total",
    cell: (sale) => formatCentsToBRL(sale.totalCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "created_at",
    header: "Data",
    cell: (sale) => formatDateTime(sale.completedAt ?? sale.createdAt),
    className: "text-right",
    headClassName: "text-right",
  },
]

const serviceOrderColumns: DataTableColumn<CustomerServiceOrder>[] = [
  {
    key: "order_number",
    header: "OS",
    cell: (serviceOrder) => serviceOrder.orderNumber,
  },
  {
    key: "device",
    header: "Aparelho",
    cell: (serviceOrder) =>
      [serviceOrder.deviceType, serviceOrder.brand, serviceOrder.model]
        .filter(Boolean)
        .join(" / "),
    className: "whitespace-normal",
  },
  {
    key: "status",
    header: "Status",
    cell: (serviceOrder) => humanizeEnumValue(serviceOrder.status),
  },
  {
    key: "total_final",
    header: "Total",
    cell: (serviceOrder) => formatCentsToBRL(serviceOrder.totalFinalCents),
    className: "text-right",
    headClassName: "text-right",
  },
]

const receivableColumns: DataTableColumn<CustomerReceivable>[] = [
  {
    key: "description",
    header: "Descrição",
    cell: (receivable) => receivable.description,
    className: "whitespace-normal",
  },
  {
    key: "status",
    header: "Status",
    cell: (receivable) => humanizeEnumValue(receivable.status),
  },
  {
    key: "amount",
    header: "Valor",
    cell: (receivable) => formatCentsToBRL(receivable.amountCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "due_date",
    header: "Vencimento",
    cell: (receivable) => formatDate(receivable.dueDate),
    className: "text-right",
    headClassName: "text-right",
  },
]

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const detail = await getCustomerFullDetail(params.id, storeContext.storeId)

  if (!detail) {
    notFound()
  }

  const { customer, sales, serviceOrders, receivables } = detail
  const openReceivables = receivables.filter(
    (receivable) =>
      !["RECEIVED", "CANCELLED"].includes(receivable.status)
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={customer.name}
        titleSlot={<ActiveStatusBadge active={customer.active} />}
        description="Consulte contato, endereço e o histórico de compras, ordens de serviço e contas deste cliente."
        backHref="/customers"
        breadcrumbs={[
          { label: "Clientes", href: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <>
            <DeactivateRecordButton
              endpoint={`/api/customers/${customer.id}`}
              redirectHref="/customers"
              confirmMessage={`Deseja inativar o cliente ${customer.name}?`}
              successMessage="Cliente inativado com sucesso."
              errorMessage="Não foi possível inativar o cliente."
              label="Inativar"
            />
            <Button asChild>
              <Link href={`/customers/${customer.id}/edit`}>
                <PencilLine />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          title="Compras"
          value={String(sales.length)}
          description="Últimas vendas vinculadas ao cliente."
          icon={<PackageSearch className="size-5" />}
        />
        <StatCard
          title="Ordens de serviço"
          value={String(serviceOrders.length)}
          description="OS registradas para este cliente."
          icon={<ShieldCheck className="size-5" />}
        />
        <StatCard
          title="Contas em aberto"
          value={String(openReceivables.length)}
          description="Títulos ainda não recebidos."
          icon={<CreditCard className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Contato"
          description="Dados principais para atendimento e comunicação."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="Telefone" value={customer.phone} />
            <FieldValue label="Telefone 2" value={customer.phone2} />
            <FieldValue label="E-mail" value={customer.email} />
            <FieldValue label="CPF/CNPJ" value={customer.cpfCnpj} />
            <FieldValue label="Atualizado em" value={formatDateTime(customer.updatedAt)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Endereço"
          description="Dados de localização e cadastro do cliente."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldValue label="CEP" value={customer.zipCode} />
            <FieldValue label="Cidade" value={customer.city} />
            <FieldValue label="Estado" value={customer.state} />
            <FieldValue label="Endereço" value={customer.address} />
          </div>
        </SectionCard>
      </div>

      {customer.notes ? (
        <SectionCard
          title="Observações"
          description="Contexto adicional registrado pela equipe."
        >
          <p className="text-sm leading-relaxed text-foreground">{customer.notes}</p>
        </SectionCard>
      ) : null}

      <Tabs defaultValue="sales" className="gap-4">
        <TabsList>
          <TabsTrigger value="sales">Compras</TabsTrigger>
          <TabsTrigger value="service-orders">Ordens de serviço</TabsTrigger>
          <TabsTrigger value="receivables">Contas a receber</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SectionCard
            title="Compras"
            description="Últimas vendas vinculadas ao cliente."
          >
            <DataTable
              columns={salesColumns}
              data={sales}
              getRowKey={(sale) => sale.id}
              getRowHref={(sale) => `/sales/${sale.id}`}
              emptyState={
                <EmptyState
                  icon={PackageSearch}
                  title="Nenhuma compra encontrada."
                  description="As vendas realizadas para este cliente aparecerão aqui."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="service-orders">
          <SectionCard
            title="Ordens de serviço"
            description="Histórico recente de atendimento técnico."
          >
            <DataTable
              columns={serviceOrderColumns}
              data={serviceOrders}
              getRowKey={(serviceOrder) => serviceOrder.id}
              getRowHref={(serviceOrder) => `/service-orders/${serviceOrder.id}`}
              emptyState={
                <EmptyState
                  icon={ShieldCheck}
                  title="Nenhuma ordem de serviço encontrada."
                  description="As OS vinculadas ao cliente aparecerão aqui."
                  className="min-h-56 rounded-none border-0 bg-transparent"
                />
              }
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="receivables">
          <SectionCard
            title="Contas a receber"
            description="Títulos e recebimentos relacionados ao cliente."
          >
            <DataTable
              columns={receivableColumns}
              data={receivables}
              getRowKey={(receivable) => receivable.id}
              emptyState={
                <EmptyState
                  icon={BadgeDollarSign}
                  title="Nenhuma conta encontrada."
                  description="Os títulos de contas a receber vinculados ao cliente aparecerão aqui."
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
