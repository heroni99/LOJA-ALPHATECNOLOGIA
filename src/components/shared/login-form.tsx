"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "Informe uma senha com ao menos 6 caracteres."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm({
  supabaseReady,
  redirectedFrom,
}: {
  supabaseReady: boolean
  redirectedFrom?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginFormValues) {
    if (!supabaseReady) {
      toast.error("Configure as credenciais do Supabase em .env.local para habilitar o login.")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Login realizado com sucesso.")

    startTransition(() => {
      router.replace("/dashboard")
      router.refresh()
    })
  }

  return (
    <Card className="border border-border/70 bg-card/95 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          Entrar no sistema
        </CardTitle>
        <CardDescription>
          Use seu e-mail e senha cadastrados no Supabase para acessar a área interna.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {redirectedFrom ? (
          <div className="rounded-3xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            O acesso a <strong className="text-foreground">{redirectedFrom}</strong> exige autenticação.
          </div>
        ) : null}
        {!supabaseReady ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            O projeto sobe normalmente sem erro, mas o login real será habilitado somente após preencher as variáveis públicas do Supabase.
          </div>
        ) : null}
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="voce@alphatecnologia.com.br"
                      autoComplete="email"
                      disabled={isPending || !supabaseReady}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isPending || !supabaseReady}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isPending || !supabaseReady}
            >
              {isPending ? "Entrando..." : "Acessar painel"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
