"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Boxes,
  Package,
  Receipt,
  ShoppingCart,
  Wrench,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDashboardHour } from "@/lib/dashboard"
import { formatCentsToBRL } from "@/lib/products"

type DashboardTodayResponse = {
  data: {
    total_value: number
    count: number
    average_ticket: number
    cancelled_count: number
    cash_status: {
      open: boolean
      terminal_name: string | null
      operator_name: string | null
      opened_at: string | null
    }
  }
}

type SalesByHourResponse = {
  data: Array<{
    hour: number
    value: number
    count: number
  }>
}

type TopProductsResponse = {
  data: Array<{
    product_id: string
    name: string
    quantity_sold: number
    total_value: number
  }>
}

type LowStockResponse = {
  data: Array<{
    id: string
    name: string
    internal_code: string
    current_stock: number
    stock_min: number
  }>
}

type ServiceOrdersSummaryResponse = {
  data: {
    open: number
    waiting_approval: number
    in_progress: number
    ready: number
  }
}

type ChartTooltipPayload = {
  payload: {
    hour: number
    value: number
    count: number
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível carregar o dashboard.")
  }

  return body as T
}

function DashboardErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

function DashboardChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ChartTooltipPayload[]
}) {
  if (!active || !payload?.[0]?.payload) {
    return null
  }

  const point = payload[0].payload

  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium text-foreground">
        {formatDashboardHour(point.hour)}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatCentsToBRL(point.value)} em {point.count} venda(s)
      </p>
    </div>
  )
}

function DashboardListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`dashboard-skeleton-${index}`}
          className="h-14 animate-pulse rounded-3xl bg-muted/60"
        />
      ))}
    </div>
  )
}

export function DashboardClientPage() {
  const todayQuery = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: () => fetchJson<DashboardTodayResponse>("/api/dashboard/today"),
    refetchInterval: 60_000,
  })
  const salesByHourQuery = useQuery({
    queryKey: ["dashboard", "sales-by-hour"],
    queryFn: () => fetchJson<SalesByHourResponse>("/api/dashboard/sales-by-hour"),
    refetchInterval: 60_000,
  })
  const topProductsQuery = useQuery({
    queryKey: ["dashboard", "top-products"],
    queryFn: () => fetchJson<TopProductsResponse>("/api/dashboard/top-products?limit=5"),
    refetchInterval: 60_000,
  })
  const lowStockQuery = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () => fetchJson<LowStockResponse>("/api/dashboard/low-stock?threshold=5"),
    refetchInterval: 60_000,
  })
  const serviceOrdersQuery = useQuery({
    queryKey: ["dashboard", "service-orders-summary"],
    queryFn: () =>
      fetchJson<ServiceOrdersSummaryResponse>("/api/dashboard/service-orders-summary"),
    refetchInterval: 60_000,
  })

  const today = todayQuery.data?.data
  const salesByHour = salesByHourQuery.data?.data ?? []
  const topProducts = topProductsQuery.data?.data ?? []
  const lowStock = lowStockQuery.data?.data ?? []
  const serviceOrders = serviceOrdersQuery.data?.data
  const cashBadgeClasses = today?.cash_status.open
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-100 text-zinc-700"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Acompanhe o movimento do dia, o caixa atual, alertas de estoque e a fila de ordens de serviço em tempo real."
        badge="Tempo real"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Vendas hoje"
          value={today ? formatCentsToBRL(today.total_value) : "--"}
          description={
            today
              ? `${today.cancelled_count} cancelada(s) hoje.`
              : "Carregando vendas concluídas do dia."
          }
          icon={<Receipt className="size-5" />}
        />
        <StatCard
          title="Qtd vendas"
          value={today ? today.count.toLocaleString("pt-BR") : "--"}
          description="Quantidade de vendas concluídas no dia atual."
          icon={<ShoppingCart className="size-5" />}
          variant="success"
        />
        <StatCard
          title="Ticket médio"
          value={today ? formatCentsToBRL(today.average_ticket) : "--"}
          description="Média por venda concluída hoje."
          icon={<BarChart3 className="size-5" />}
        />
        <StatCard
          title="Status caixa"
          value={
            today ? (
              <span className="inline-flex">
                <Badge variant="outline" className={cashBadgeClasses}>
                  {today.cash_status.open ? "Aberto" : "Fechado"}
                </Badge>
              </span>
            ) : (
              "--"
            )
          }
          description={
            today
              ? `Terminal: ${today.cash_status.terminal_name ?? "Caixa Principal"}`
              : "Carregando sessão atual."
          }
          icon={<Boxes className="size-5" />}
          variant="warning"
        />
      </div>

      <SectionCard
        title="Vendas por hora"
        description="Distribuição das vendas concluídas ao longo do dia atual, atualizada automaticamente a cada minuto."
      >
        {salesByHourQuery.error ? (
          <DashboardErrorMessage message={salesByHourQuery.error.message} />
        ) : salesByHourQuery.isLoading && salesByHour.length === 0 ? (
          <div className="h-[360px] animate-pulse rounded-3xl bg-muted/50" />
        ) : (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(value) => formatDashboardHour(Number(value))}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatCentsToBRL(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  width={96}
                />
                <Tooltip content={<DashboardChartTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#F97316"
                  radius={[14, 14, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top 5 produtos hoje"
          description="Produtos com maior quantidade vendida no dia atual."
        >
          {topProductsQuery.error ? (
            <DashboardErrorMessage message={topProductsQuery.error.message} />
          ) : topProductsQuery.isLoading && topProducts.length === 0 ? (
            <DashboardListSkeleton />
          ) : topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((item, index) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity_sold.toLocaleString("pt-BR")} vendida(s)
                      </p>
                    </div>
                  </div>
                  <strong className="text-foreground">
                    {formatCentsToBRL(item.total_value)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="Sem vendas registradas hoje."
              description="Quando o PDV concluir vendas no dia, os produtos mais vendidos aparecerão aqui."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Alertas de estoque"
          description="Produtos com saldo igual ou abaixo do mínimo operacional."
        >
          {lowStockQuery.error ? (
            <DashboardErrorMessage message={lowStockQuery.error.message} />
          ) : lowStockQuery.isLoading && lowStock.length === 0 ? (
            <DashboardListSkeleton />
          ) : lowStock.length > 0 ? (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-red-200 bg-red-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-red-900">{item.name}</p>
                      <p className="text-sm text-red-700">
                        {item.internal_code} • Atual:{" "}
                        {item.current_stock.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-red-200 text-red-700">
                      Mín: {item.stock_min.toLocaleString("pt-BR")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-700">
              Nenhum produto abaixo do mínimo.
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/service-orders?status=OPEN",
            label: "Em aberto",
            value: serviceOrders?.open ?? 0,
            description: "Aguardando triagem ou diagnóstico inicial.",
          },
          {
            href: "/service-orders?status=WAITING_APPROVAL",
            label: "Aguardando aprovação",
            value: serviceOrders?.waiting_approval ?? 0,
            description: "Serviços aguardando retorno do cliente.",
          },
          {
            href: "/service-orders?status=IN_PROGRESS",
            label: "Em andamento",
            value: serviceOrders?.in_progress ?? 0,
            description: "Ordens em execução pela equipe técnica.",
          },
          {
            href: "/service-orders?status=READY_FOR_DELIVERY",
            label: "Prontas para entrega",
            value: serviceOrders?.ready ?? 0,
            description: "Equipamentos liberados para retirada.",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardDescription>{item.label}</CardDescription>
                    <CardTitle className="text-3xl font-semibold tracking-tight">
                      {serviceOrdersQuery.isLoading && !serviceOrders ? "--" : item.value}
                    </CardTitle>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Wrench className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {serviceOrdersQuery.error ? (
                  <span className="text-red-700">Falha ao carregar o resumo.</span>
                ) : (
                  item.description
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {todayQuery.error ? (
        <DashboardErrorMessage message={todayQuery.error.message} />
      ) : null}
    </div>
  )
}
