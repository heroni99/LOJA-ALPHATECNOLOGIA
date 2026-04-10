import Link from "next/link"
import { BarChart3, Package, Receipt } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Acesse análises operacionais com base nas vendas e no estoque atual da loja, com filtros e exportação CSV."
        badge="Análises"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Link href="/reports/sales" className="block">
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardDescription>Relatório operacional</CardDescription>
                  <CardTitle className="text-xl">Vendas</CardTitle>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Receipt className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Analise o período, filtre por status e cliente, consulte ticket médio
              e exporte CSV com pagamentos.
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports/stock" className="block">
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardDescription>Relatório operacional</CardDescription>
                  <CardTitle className="text-xl">Estoque</CardTitle>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Package className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Consulte o saldo consolidado por produto, o detalhe por local e
              exporte uma visão completa do estoque atual.
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="rounded-4xl border border-border/70 bg-card/95 p-8 shadow-sm shadow-black/5">
        <div className="flex items-start gap-4">
          <div className="rounded-3xl bg-primary/10 p-3 text-primary">
            <BarChart3 className="size-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Exportações prontas para uso
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Os relatórios usam dados reais da operação e geram arquivos CSV com
              compatibilidade para planilhas em pt-BR.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
