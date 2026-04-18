"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Boxes,
  ClipboardList,
  Clock3,
  Package,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Wallet,
  Wrench,
} from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatQuantity } from "@/lib/products"

type DashboardTodayResponse = {
  total_value: number
  total_count: number
  average_ticket: number
  cancelled_count: number
  cash_session_open: boolean
}

type SalesByHourResponse = Array<{
  hour: number
  value: number
  count: number
}>

type TopProductsResponse = Array<{
  product_id: string
  name: string
  internal_code: string
  quantity_sold: number
  total_value: number
}>

type LowStockResponse = Array<{
  id: string
  name: string
  internal_code: string
  current_stock: number
  stock_min: number
}>

type ServiceOrdersSummaryResponse = {
  open: number
  waiting_approval: number
  in_progress: number
  ready_for_delivery: number
  total: number
}

type SalesLast7DaysResponse = Array<{
  date: string
  value: number
  count: number
}>

type ChartTooltipPayload = {
  payload: {
    hour?: number
    date?: string
    value: number
    count: number
  }
}

const DASHBOARD_REFRESH_INTERVAL = 60_000

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatMoney(value: number) {
  return moneyFormatter.format(value / 100)
}

function formatChartAxisMoney(value: number) {
  return `R$${(value / 100).toFixed(0)}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body.error ?? "Erro ao carregar dados")
  }

  return body as T
}
function DashboardSectionError({
  onRetry,
}: {
  onRetry: () => Promise<unknown>
}) {
  return (
    <Card className="border border-red-200 bg-red-50/70 shadow-sm shadow-black/5">
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-1">
          <p className="font-medium text-red-700">Erro ao carregar dados</p>
          <p className="text-sm text-red-600">
            Tente novamente para atualizar esta seção.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
          onClick={() => void onRetry()}
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  )
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={`dashboard-stat-skeleton-${index}`}
          className="h-36 rounded-4xl"
        />
      ))}
    </div>
  )
}

function DashboardChartSkeleton({ height }: { height: number }) {
  return <Skeleton className="w-full rounded-3xl" style={{ height }} />
}

function DashboardListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          key={`dashboard-list-skeleton-${index}`}
          className="h-16 rounded-3xl"
        />
      ))}
    </div>
  )
}

function DashboardServiceOrdersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={`dashboard-service-order-skeleton-${index}`}
          className="h-40 rounded-4xl"
        />
      ))}
    </div>
  )
}

function SalesByHourTooltip({
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
        {point.hour}h
      </p>
      <p className="text-sm text-muted-foreground">
        {formatMoney(point.value)} em {formatNumber(point.count)} venda(s)
      </p>
    </div>
  )
}

function SalesLast7DaysTooltip({
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
      <p className="text-sm font-medium text-foreground">{point.date}</p>
      <p className="text-sm text-muted-foreground">
        {formatMoney(point.value)} em {formatNumber(point.count)} venda(s)
      </p>
    </div>
  )
}

export function DashboardClientPage() {
  const todayQuery = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: () => fetchJson<DashboardTodayResponse>("/api/dashboard/today"),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const salesByHourQuery = useQuery({
    queryKey: ["dashboard", "sales-by-hour"],
    queryFn: () =>
      fetchJson<SalesByHourResponse>("/api/dashboard/sales-by-hour"),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const topProductsQuery = useQuery({
    queryKey: ["dashboard", "top-products"],
    queryFn: () =>
      fetchJson<TopProductsResponse>("/api/dashboard/top-products?limit=5"),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const lowStockQuery = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () =>
      fetchJson<LowStockResponse>("/api/dashboard/low-stock?threshold=5"),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const salesLast7DaysQuery = useQuery({
    queryKey: ["dashboard", "sales-last-7-days"],
    queryFn: () =>
      fetchJson<SalesLast7DaysResponse>("/api/dashboard/sales-last-7-days"),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const serviceOrdersQuery = useQuery({
    queryKey: ["dashboard", "service-orders-summary"],
    queryFn: () =>
      fetchJson<ServiceOrdersSummaryResponse>(
        "/api/dashboard/service-orders-summary"
      ),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
  })

  const today = todayQuery.data
  const salesByHour = salesByHourQuery.data ?? []
  const topProducts = topProductsQuery.data ?? []
  const lowStock = lowStockQuery.data ?? []
  const salesLast7Days = salesLast7DaysQuery.data ?? []
  const serviceOrders = serviceOrdersQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        badge="Ao vivo"
        description="KPIs reais da operação com atualização automática a cada minuto."
      />

      {todayQuery.isPending && !today ? (
        <DashboardStatsSkeleton />
      ) : todayQuery.isError ? (
        <DashboardSectionError onRetry={todayQuery.refetch} />
      ) : today ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Vendas hoje"
            value={formatMoney(today.total_value)}
            description={`${formatNumber(today.cancelled_count)} cancelada(s) hoje.`}
            icon={<Receipt className="size-5" />}
            variant={today.total_value > 0 ? "success" : "default"}
            className={
              today.total_value > 0
                ? undefined
                : "border-zinc-200 bg-zinc-50/80"
            }
          />
          <StatCard
            title="Número de vendas"
            value={formatNumber(today.total_count)}
            description="Quantidade de vendas concluídas no dia."
            icon={<ShoppingCart className="size-5" />}
          />
          <StatCard
            title="Ticket médio"
            value={formatMoney(today.average_ticket)}
            description="Valor médio por venda concluída hoje."
            icon={<Wallet className="size-5" />}
          />
          <Link href="/cash" className="block">
            <StatCard
              title="Status do caixa"
              value={
                <span className="inline-flex">
                  <Badge
                    variant="outline"
                    className={
                      today.cash_session_open
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-zinc-100 text-zinc-700"
                    }
                  >
                    {today.cash_session_open ? "Aberto" : "Fechado"}
                  </Badge>
                </span>
              }
              description="Clique para abrir o módulo de caixa."
              icon={<Boxes className="size-5" />}
              className="h-full transition-transform hover:-translate-y-0.5"
            />
          </Link>
        </div>
      ) : null}

      <SectionCard
        title="Vendas por hora — hoje"
        description="Volume de vendas distribuído ao longo do dia atual."
      >
        {salesByHourQuery.isPending && salesByHour.length === 0 ? (
          <DashboardChartSkeleton height={240} />
        ) : salesByHourQuery.isError ? (
          <DashboardSectionError onRetry={salesByHourQuery.refetch} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={salesByHour}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(hour) => `${hour}h`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatChartAxisMoney(Number(value))}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<SalesByHourTooltip />} />
              <Bar
                dataKey="value"
                fill="#F97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top 5 produtos hoje"
          description="Itens com maior quantidade vendida no dia."
        >
          {topProductsQuery.isPending && topProducts.length === 0 ? (
            <DashboardListSkeleton />
          ) : topProductsQuery.isError ? (
            <DashboardSectionError onRetry={topProductsQuery.refetch} />
          ) : topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((item, index) => (
                <div
                  key={item.product_id}
                  className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.internal_code}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatQuantity(item.quantity_sold)} vendida(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <strong className="whitespace-nowrap text-foreground">
                    {formatMoney(item.total_value)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="Nenhuma venda hoje"
              description="Quando houver vendas concluídas, os produtos mais vendidos aparecerão aqui."
              className="min-h-56 rounded-none border-0 bg-transparent"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Alertas de estoque"
          description="Produtos com saldo igual ou abaixo do limite operacional."
          action={
            <Badge className="bg-red-500 text-white hover:bg-red-500">
              {formatNumber(lowStock.length)}
            </Badge>
          }
        >
          {lowStockQuery.isPending && lowStock.length === 0 ? (
            <DashboardListSkeleton />
          ) : lowStockQuery.isError ? (
            <DashboardSectionError onRetry={lowStockQuery.refetch} />
          ) : lowStock.length > 0 ? (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-red-200 bg-red-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-red-900">{item.name}</p>
                      <p className="text-sm text-red-700">
                        Código {item.internal_code}
                      </p>
                    </div>
                    <p className="text-right text-sm font-semibold text-red-700">
                      Atual: {formatQuantity(item.current_stock)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 px-4 py-6 text-sm font-medium text-emerald-700">
              Tudo em ordem
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Vendas — últimos 7 dias"
        description="Comparativo diário de faturamento e volume recente."
      >
        {salesLast7DaysQuery.isPending && salesLast7Days.length === 0 ? (
          <DashboardChartSkeleton height={200} />
        ) : salesLast7DaysQuery.isError ? (
          <DashboardSectionError onRetry={salesLast7DaysQuery.refetch} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesLast7Days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => formatChartAxisMoney(Number(value))}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<SalesLast7DaysTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ fill: "#F97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {serviceOrdersQuery.isPending && !serviceOrders ? (
        <DashboardServiceOrdersSkeleton />
      ) : serviceOrdersQuery.isError ? (
        <DashboardSectionError onRetry={serviceOrdersQuery.refetch} />
      ) : serviceOrders ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/service-orders?status=OPEN",
              label: "Em aberto",
              value: serviceOrders.open,
              icon: ClipboardList,
            },
            {
              href: "/service-orders?status=WAITING_APPROVAL",
              label: "Aguardando",
              value: serviceOrders.waiting_approval,
              icon: Clock3,
            },
            {
              href: "/service-orders?status=IN_PROGRESS",
              label: "Em andamento",
              value: serviceOrders.in_progress,
              icon: Wrench,
            },
            {
              href: "/service-orders?status=READY_FOR_DELIVERY",
              label: "Prontos",
              value: serviceOrders.ready_for_delivery,
              icon: PackageCheck,
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle className="text-4xl font-semibold tracking-tight">
                          {formatNumber(item.value)}
                        </CardTitle>
                      </div>
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Icon className="size-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    Clique para abrir a fila filtrada.
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
