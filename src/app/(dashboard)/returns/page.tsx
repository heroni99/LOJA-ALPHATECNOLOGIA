import Link from "next/link"
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { notFound } from "next/navigation"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatFinancialMoney } from "@/lib/financial"
import { formatDateTime } from "@/lib/products"
import { getCurrentStoreContext } from "@/lib/products-server"
import { getSaleReturnRefundTypeLabel, type SaleReturnSummary } from "@/lib/sale-returns"
import { listSaleReturns } from "@/lib/sale-returns-server"

type ReturnsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const returnColumns: DataTableColumn<SaleReturnSummary>[] = [
  {
    key: "return_number",
    header: "Devolução",
    cell: (entry) => <span className="font-medium text-foreground">{entry.returnNumber}</span>,
  },
  {
    key: "sale_number",
    header: "Venda",
    cell: (entry) => entry.saleNumber ?? "Venda não encontrada",
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (entry) => entry.customerName ?? "Consumidor final",
  },
  {
    key: "refund_type",
    header: "Resolução",
    cell: (entry) => getSaleReturnRefundTypeLabel(entry.refundType),
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

function getPageFromSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const rawPage = searchParams.page
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const page = Number.parseInt(value ?? "1", 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

function buildPageHref(page: number) {
  return page > 1 ? `/returns?page=${page}` : "/returns"
}

export default async function ReturnsPage({ searchParams = {} }: ReturnsPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const returnsPage = await listSaleReturns(
    storeContext.storeId,
    getPageFromSearchParams(searchParams)
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Devoluções"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {returnsPage.totalCount}{" "}
            {returnsPage.totalCount === 1 ? "registro" : "registros"}
          </Badge>
        }
        description="Acompanhe trocas, devoluções em dinheiro e créditos emitidos a partir do histórico de vendas."
        actions={
          <Button variant="outline" asChild>
            <Link href="/sales">Abrir histórico de vendas</Link>
          </Button>
        }
      />

      <SectionCard
        title="Histórico de devoluções"
        description="Clique em uma linha para abrir a venda de origem e revisar os detalhes do atendimento."
      >
        <DataTable
          columns={returnColumns}
          data={returnsPage.items}
          getRowKey={(entry) => entry.id}
          getRowHref={(entry) => (entry.saleId ? `/sales/${entry.saleId}` : null)}
          emptyState={
            <EmptyState
              icon={ArrowRightLeft}
              title="Nenhuma devolução encontrada."
              description="Quando houver trocas ou devoluções registradas nas vendas, elas aparecerão aqui."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {returnsPage.page} de {returnsPage.totalPages}
          </p>
          <div className="flex gap-2">
            {returnsPage.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(returnsPage.page - 1)}>
                  <ChevronLeft />
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft />
                Anterior
              </Button>
            )}
            {returnsPage.page < returnsPage.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(returnsPage.page + 1)}>
                  Próxima
                  <ChevronRight />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Próxima
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
