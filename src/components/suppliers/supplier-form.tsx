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
  defaultSupplierFormValues,
  supplierFormSchema,
  type SupplierFormValues,
  toSupplierMutationInput,
} from "@/lib/suppliers"

type SupplierFormProps = {
  mode: "create" | "edit"
  initialValues?: SupplierFormValues
  supplierId?: string
}

function BooleanField({
  control,
  name,
  label,
  description,
}: {
  control: Control<SupplierFormValues>
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

export function SupplierForm({
  mode,
  initialValues = defaultSupplierFormValues,
  supplierId,
}: SupplierFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialValues,
  })

  async function handleSubmit(values: SupplierFormValues) {
    try {
      setIsSaving(true)

      const payload = toSupplierMutationInput(values)
      const response = await fetch(
        mode === "create" ? "/api/suppliers" : `/api/suppliers/${supplierId}`,
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
        throw new Error(responseData?.error ?? "Não foi possível salvar o fornecedor.")
      }

      toast.success(
        mode === "create"
          ? "Fornecedor criado com sucesso."
          : "Fornecedor atualizado com sucesso."
      )

      router.push(`/suppliers/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o fornecedor."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}
      description={
        mode === "create"
          ? "Cadastre um parceiro comercial com dados fiscais, contato, endereço e observações."
          : "Atualize o cadastro do fornecedor mantendo histórico e vínculo com produtos e pedidos."
      }
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href={mode === "create" ? "/suppliers" : `/suppliers/${supplierId}`}>
              Cancelar
            </Link>
          </Button>
          <Button type="submit" form="supplier-form" disabled={isSaving}>
            <Save />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="supplier-form"
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
                      <Input placeholder="Ex.: PMCELL São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trade_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 xl:col-span-2">
                    <FormLabel>Razão social</FormLabel>
                    <FormControl>
                      <Input placeholder="Razão social da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0001-00" {...field} />
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
                      <Input placeholder="contato@fornecedor.com" {...field} />
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
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato comercial" {...field} />
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
                        placeholder="Prazos, condições comerciais, informações internas..."
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
                label="Fornecedor ativo"
                description="Fornecedores inativos saem dos fluxos operacionais, mas o histórico comercial permanece."
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </FormPage>
  )
}
