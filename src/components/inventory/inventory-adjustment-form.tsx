"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import type { InventoryLocationOption, InventoryProductOption } from "@/lib/inventory"
import {
  defaultInventoryAdjustmentFormValues,
  formatQuantity,
  formatQuantityInput,
  inventoryAdjustmentFormSchema,
  parseQuantityInput,
  type InventoryAdjustmentFormValues,
  toInventoryAdjustmentMutationInput,
} from "@/lib/inventory"
import { ProductAutocomplete } from "@/components/inventory/product-autocomplete"
import { useProductLocationBalance } from "@/components/inventory/use-product-location-balance"
import { FormPage } from "@/components/shared/form-page"
import { FormSection } from "@/components/shared/form-section"
import { LoadingButton } from "@/components/shared/loading-button"
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

type InventoryAdjustmentFormProps = {
  locations: InventoryLocationOption[]
}

function formatDifference(value: number) {
  if (value > 0) {
    return `+${formatQuantity(value)}`
  }

  return formatQuantity(value)
}

export function InventoryAdjustmentForm({
  locations,
}: InventoryAdjustmentFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductOption | null>(
    null
  )
  const form = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues: defaultInventoryAdjustmentFormValues,
  })
  const productId = form.watch("product_id")
  const locationId = form.watch("location_id")
  const nextQuantity = parseQuantityInput(form.watch("new_quantity"))
  const { quantity: currentQuantity, isLoading } = useProductLocationBalance(
    productId,
    locationId
  )
  const difference = useMemo(
    () => nextQuantity - currentQuantity,
    [currentQuantity, nextQuantity]
  )

  async function handleSubmit(values: InventoryAdjustmentFormValues) {
    try {
      setIsSaving(true)

      const payload = toInventoryAdjustmentMutationInput(values)
      const response = await fetch("/api/inventory/adjustment", {
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
          responseData?.error ?? "Não foi possível registrar o ajuste."
        )
      }

      toast.success("Ajuste de estoque registrado com sucesso.")
      form.reset(defaultInventoryAdjustmentFormValues)
      setSelectedProduct(null)
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
      title="Ajuste de estoque"
      description="Atualize o saldo real do produto em um local específico e registre o motivo da correção."
      backHref="/inventory"
      breadcrumbs={[
        { label: "Estoque", href: "/inventory" },
        { label: "Ajuste" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="inventory-adjustment-form"
            isLoading={isSaving}
            loadingLabel="Confirmando..."
          >
            <Save />
            Confirmar ajuste
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form
          id="inventory-adjustment-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Ajuste">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Produto *</FormLabel>
                      <FormControl>
                        <ProductAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          onProductSelect={setSelectedProduct}
                        />
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
                      <FormLabel>Local *</FormLabel>
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

                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Quantidade atual
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {productId && locationId
                      ? isLoading
                        ? "Carregando..."
                        : formatQuantity(currentQuantity)
                      : "Selecione produto e local"}
                  </p>
                  {selectedProduct ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedProduct.internalCode} - {selectedProduct.name}
                    </p>
                  ) : null}
                </div>

                <FormField
                  control={form.control}
                  name="new_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova quantidade *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
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

                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Diferença calculada
                  </p>
                  <p
                    className={[
                      "mt-2 text-2xl font-semibold",
                      difference > 0
                        ? "text-emerald-700"
                        : difference < 0
                          ? "text-red-700"
                          : "text-foreground",
                    ].join(" ")}
                  >
                    {formatDifference(difference)}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Motivo do ajuste *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-32"
                          placeholder="Explique a divergência encontrada, inventário ou correção realizada."
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
