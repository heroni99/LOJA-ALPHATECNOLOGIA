"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import {
  CustomerSearch,
  type CustomerSearchOption,
} from "@/components/service-orders/customer-search"
import { ColorPicker } from "@/components/shared/color-picker"
import { FormPage } from "@/components/shared/form-page"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  defaultServiceOrderFormValues,
  serviceOrderFormSchema,
  type ServiceOrderFormValues,
  toServiceOrderCreateInput,
} from "@/lib/service-orders"
import { toast } from "@/lib/toast"

type ServiceOrderFormProps = {
  initialValues?: ServiceOrderFormValues
}

export function ServiceOrderForm({
  initialValues = defaultServiceOrderFormValues,
}: ServiceOrderFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSearchOption | null>(null)
  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderFormSchema),
    defaultValues: initialValues,
  })

  async function handleSubmit(values: ServiceOrderFormValues) {
    try {
      setIsSaving(true)

      const payload = toServiceOrderCreateInput(values)
      const response = await fetch("/api/service-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível criar a OS."
        )
      }

      toast.success("Ordem de serviço criada com sucesso.")
      router.push(`/service-orders/${responseData.data.id}`)
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
      title="Nova ordem de serviço"
      description="Abra uma OS com cliente, aparelho e relato inicial para a equipe técnica seguir com diagnóstico, orçamento e entrega."
      backHref="/service-orders"
      breadcrumbs={[
        { label: "Ordens de serviço", href: "/service-orders" },
        { label: "Nova OS" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/service-orders">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="service-order-form"
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
          id="service-order-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="overflow-visible border border-border/70 bg-card/95 shadow-sm shadow-black/5">
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="overflow-visible">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <FormControl>
                        <CustomerSearch
                          ref={field.ref}
                          name={field.name}
                          onBlur={field.onBlur}
                          value={selectedCustomer}
                          onChange={(customer) => {
                            setSelectedCustomer(customer)
                            field.onChange(customer?.id ?? "")
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
              <CardHeader>
                <CardTitle>Aparelho</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                  control={form.control}
                  name="device_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do aparelho *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Smartphone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Apple" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: iPhone 15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <ColorPicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMEI</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de série" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessories"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 xl:col-span-2">
                      <FormLabel>Acessórios</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex.: capa, película, carregador, chip"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
              <CardHeader>
                <CardTitle>Atendimento</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="reported_issue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problema relatado *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-40"
                          placeholder="Descreva com detalhes o defeito informado pelo cliente."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </fieldset>
        </form>
      </Form>
    </FormPage>
  )
}
