"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import type { InventoryLocationOption, InventoryProductOption } from "@/lib/inventory"
import {
  defaultInventoryTransferFormValues,
  formatQuantity,
  formatQuantityInput,
  inventoryTransferFormSchema,
  parseQuantityInput,
  type InventoryTransferFormValues,
  toInventoryTransferMutationInput,
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

type InventoryTransferFormProps = {
  locations: InventoryLocationOption[]
}

export function InventoryTransferForm({
  locations,
}: InventoryTransferFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductOption | null>(
    null
  )
  const form = useForm<InventoryTransferFormValues>({
    resolver: zodResolver(inventoryTransferFormSchema),
    defaultValues: defaultInventoryTransferFormValues,
  })
  const productId = form.watch("product_id")
  const fromLocationId = form.watch("from_location_id")
  const quantity = parseQuantityInput(form.watch("quantity"))
  const { quantity: availableQuantity, isLoading } = useProductLocationBalance(
    productId,
    fromLocationId
  )
  const destinationLocations = useMemo(
    () => locations.filter((location) => location.id !== fromLocationId),
    [fromLocationId, locations]
  )

  async function handleSubmit(values: InventoryTransferFormValues) {
    try {
      setIsSaving(true)

      const payload = toInventoryTransferMutationInput(values)

      if (payload.quantity > availableQuantity) {
        throw new Error("A quantidade informada excede o saldo disponível no local de origem.")
      }

      const response = await fetch("/api/inventory/transfer", {
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
          responseData?.error ?? "Não foi possível registrar a transferência."
        )
      }

      toast.success("Transferência de estoque registrada com sucesso.")
      form.reset(defaultInventoryTransferFormValues)
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
      title="Transferência de estoque"
      description="Movimente saldo entre dois locais, mantendo o histórico completo da saída e da entrada."
      backHref="/inventory"
      breadcrumbs={[
        { label: "Estoque", href: "/inventory" },
        { label: "Transferência" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="inventory-transfer-form"
            isLoading={isSaving}
            loadingLabel="Confirmando..."
          >
            <Save />
            Confirmar transferência
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form
          id="inventory-transfer-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Transferência">
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
                  name="from_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de origem *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          if (form.getValues("to_location_id") === value) {
                            form.setValue("to_location_id", "")
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a origem" />
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
                    Saldo disponível
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {productId && fromLocationId
                      ? isLoading
                        ? "Carregando..."
                        : formatQuantity(availableQuantity)
                      : "Selecione produto e origem"}
                  </p>
                  {selectedProduct ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedProduct.internalCode} - {selectedProduct.name}
                    </p>
                  ) : null}
                </div>

                <FormField
                  control={form.control}
                  name="to_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de destino *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {destinationLocations.map((location) => (
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
                      {productId && fromLocationId ? (
                        <p className="text-xs text-muted-foreground">
                          Disponível na origem: {formatQuantity(availableQuantity)}
                          {quantity > availableQuantity ? " · quantidade acima do disponível" : ""}
                        </p>
                      ) : null}
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
                          placeholder="Informações operacionais sobre a transferência."
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
