import { Lock, Settings2, ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"

import { ActionDialogButton } from "@/components/shared/action-dialog-button"
import { LoginForm } from "@/components/shared/login-form"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: {
    redirectedFrom?: string | string[]
  }
}) {
  const user = await getCurrentUser()

  if (user) {
    redirect("/dashboard")
  }

  const supabaseReady = isSupabaseConfigured()
  const redirectedFrom = Array.isArray(searchParams?.redirectedFrom)
    ? searchParams?.redirectedFrom[0]
    : searchParams?.redirectedFrom

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-secondary px-10 py-12 text-secondary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.32),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.98),rgba(17,24,39,1))]" />
        <div className="relative flex flex-1 flex-col justify-between">
          <div>
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              ALPHA TECNOLOGIA v2
            </Badge>
            <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-tight">
              Base pronta para um ERP/PDV de loja de celular crescer com segurança.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              App Router, Supabase, middleware de autenticação, estrutura modular e design system configurados para expansão do produto.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium">Sessão protegida</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Rotas administrativas protegidas por middleware com atualização de sessão centralizada.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <Settings2 className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium">Estrutura preparada</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Produtos, clientes, estoque, caixa, PDV e vendas já nascem com shell útil e pronto para implementação incremental.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-3">
            <Badge variant="outline" className="border-primary/20 text-primary">
              Acesso interno
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Entre para operar a loja
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Ambiente inicial do ERP/PDV da ALPHA TECNOLOGIA.
              </p>
            </div>
          </div>

          {!supabaseReady ? (
            <div className="rounded-[2rem] border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Lock className="size-4" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Configuração do Supabase pendente
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local` para ativar o login real.
                    </p>
                  </div>
                  <ActionDialogButton
                    label="Ver checklist"
                    title="Checklist de configuração"
                    icon={Settings2}
                    variant="outline"
                  >
                    <p>1. Substitua os placeholders do arquivo `.env.local` pelos valores do seu projeto Supabase.</p>
                    <p>2. Reinicie o `npm run dev` para recarregar as variáveis públicas no client.</p>
                    <p>3. Garanta que exista ao menos um usuário válido para testar o fluxo de login.</p>
                  </ActionDialogButton>
                </div>
              </div>
            </div>
          ) : null}

          <LoginForm
            supabaseReady={supabaseReady}
            redirectedFrom={redirectedFrom}
          />
        </div>
      </section>
    </div>
  )
}
