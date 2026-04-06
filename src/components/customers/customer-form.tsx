"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { type Control, useForm } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "@/components/ui/toast"
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

function BooleanField({
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
        <FormItem className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/80 p-4">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <input
              type="checkbox"
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              className="mt-1 size-4 rounded border-border accent-primary"
            />
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
        throw new Error(responseData?.error ?? "Não foi possível salvar o cliente.")
      }

      toast.success(
        mode === "create"
          ? "Cliente criado com sucesso."
          : "Cliente atualizado com sucesso."
      )

      router.push(`/customers/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar o cliente."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo cliente" : "Editar cliente"}
      description={
        mode === "create"
          ? "Cadastre um cliente com dados de contato, endereço e observações para atendimento, vendas e pós-venda."
          : "Atualize os dados do cliente sem sair do fluxo principal do CRM operacional."
      }
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href={mode === "create" ? "/customers" : `/customers/${customerId}`}>
              Cancelar
            </Link>
          </Button>
          <Button type="submit" form="customer-form" disabled={isSaving}>
            <Save />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="customer-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Dados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 xl:col-span-2">
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
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <FormItem className="md:col-span-2 xl:col-span-3">
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
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Outros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Preferências, contexto comercial, observações de atendimento..."
                        className="min-h-40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <BooleanField
                control={form.control}
                name="active"
                label="Cliente ativo"
                description="Clientes inativos saem dos fluxos operacionais, mas o histórico continua disponível."
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </FormPage>
  )
}
