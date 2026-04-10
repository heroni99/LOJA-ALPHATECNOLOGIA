"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { type Control, useForm } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
import { FormSection } from "@/components/shared/form-section"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"
import {
  customerFormSchema,
  defaultCustomerFormValues,
  type CustomerFormValues,
  toCustomerMutationInput,
} from "@/lib/customers"

type CustomerFormProps = {
  mode: "create" | "edit"
  initialValues?: CustomerFormValues
  customerId?: string
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: Control<CustomerFormValues>
  name: "active"
  label: string
  description: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/70 p-4">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={[
                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                field.value
                  ? "border-primary bg-primary"
                  : "border-border bg-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block size-5 rounded-full bg-white transition-transform",
                  field.value ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </FormControl>
        </FormItem>
      )}
    />
  )
}

export function CustomerForm({
  mode,
  initialValues = defaultCustomerFormValues,
  customerId,
}: CustomerFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: initialValues,
  })

  async function handleSubmit(values: CustomerFormValues) {
    try {
      setIsSaving(true)

      const payload = toCustomerMutationInput(values)
      const response = await fetch(
        mode === "create" ? "/api/customers" : `/api/customers/${customerId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível salvar o cliente."
        )
      }

      toast.success(
        mode === "create"
          ? "Cliente criado com sucesso."
          : "Cliente atualizado com sucesso."
      )

      router.push(`/customers/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo cliente" : "Editar cliente"}
      description={
        mode === "create"
          ? "Cadastre dados pessoais, endereço e observações para o histórico comercial e técnico."
          : "Atualize o cadastro do cliente mantendo o histórico de compras, OS e contas."
      }
      backHref={mode === "create" ? "/customers" : `/customers/${customerId}`}
      breadcrumbs={[
        { label: "Clientes", href: "/customers" },
        { label: mode === "create" ? "Novo cliente" : "Editar cliente" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/customers">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="customer-form"
            isLoading={isSaving}
            loadingLabel="Salvando..."
          >
            <Save />
            Salvar
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form
          id="customer-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Dados pessoais">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: João da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone adicional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="cliente@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf_cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Endereço">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, complemento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Outros">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Preferências, contexto comercial e observações de atendimento."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <ToggleField
                    control={form.control}
                    name="active"
                    label="Cliente ativo"
                    description="Clientes inativos saem dos fluxos operacionais, mas o histórico continua disponível."
                  />
                </div>
              </FormSection>
            </CardContent>
            </Card>
          </fieldset>
        </form>
      </Form>
    </FormPage>
  )
}
