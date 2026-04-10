"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import type { InventoryLocationOption } from "@/lib/inventory"
import {
  defaultInventoryEntryFormValues,
  formatQuantityInput,
  inventoryEntryFormSchema,
  type InventoryEntryFormValues,
  toInventoryEntryMutationInput,
} from "@/lib/inventory"
import { ProductAutocomplete } from "@/components/inventory/product-autocomplete"
import { FormPage } from "@/components/shared/form-page"
import { FormSection } from "@/components/shared/form-section"
import { LoadingButton } from "@/components/shared/loading-button"
import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"

type InventoryEntryFormProps = {
  locations: InventoryLocationOption[]
}

export function InventoryEntryForm({ locations }: InventoryEntryFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<InventoryEntryFormValues>({
    resolver: zodResolver(inventoryEntryFormSchema),
    defaultValues: defaultInventoryEntryFormValues,
  })

  async function handleSubmit(values: InventoryEntryFormValues) {
    try {
      setIsSaving(true)

      const payload = toInventoryEntryMutationInput(values)
      const response = await fetch("/api/inventory/entry", {
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
          responseData?.error ?? "Não foi possível registrar a entrada."
        )
      }

      toast.success("Entrada de estoque registrada com sucesso.")
      form.reset(defaultInventoryEntryFormValues)
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
      title="Entrada de estoque"
      description="Lance recebimentos e incremente o saldo do produto no local de destino."
      backHref="/inventory"
      breadcrumbs={[
        { label: "Estoque", href: "/inventory" },
        { label: "Entrada" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="inventory-entry-form"
            isLoading={isSaving}
            loadingLabel="Confirmando..."
          >
            <Save />
            Confirmar entrada
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form
          id="inventory-entry-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Entrada">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Produto *</FormLabel>
                      <FormControl>
                        <ProductAutocomplete value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de destino *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0.001"
                          step="0.001"
                          inputMode="decimal"
                          onChange={(event) =>
                            field.onChange(formatQuantityInput(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo unitário *</FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0,00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-32"
                          placeholder="Informações sobre recebimento, conferência ou origem da entrada."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>
          </fieldset>
        </form>
      </Form>
    </FormPage>
  )
}
