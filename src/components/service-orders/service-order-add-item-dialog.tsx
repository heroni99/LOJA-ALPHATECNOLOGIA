"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import { ProductAutocomplete } from "@/components/inventory/product-autocomplete"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  defaultServiceOrderItemFormValues,
  formatServiceOrderCurrencyInput,
  serviceOrderItemFormSchema,
  type ServiceOrderItemFormValues,
  toServiceOrderItemMutationInput,
} from "@/lib/service-orders"
import { toast } from "@/lib/toast"

type ServiceOrderAddItemDialogProps = {
  serviceOrderId: string
  disabled?: boolean
}

export function ServiceOrderAddItemDialog({
  serviceOrderId,
  disabled = false,
}: ServiceOrderAddItemDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<ServiceOrderItemFormValues>({
    resolver: zodResolver(serviceOrderItemFormSchema),
    defaultValues: defaultServiceOrderItemFormValues,
  })

  async function handleSubmit(values: ServiceOrderItemFormValues) {
    try {
      setIsSaving(true)

      const payload = toServiceOrderItemMutationInput(values)
      const response = await fetch(`/api/service-orders/${serviceOrderId}/items`, {
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
          responseData?.error ?? "Não foi possível adicionar a peça."
        )
      }

      toast.success("Peça adicionada e estoque consumido com sucesso.")
      setOpen(false)
      form.reset(defaultServiceOrderItemFormValues)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus />
          Adicionar peça
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar peça</DialogTitle>
          <DialogDescription>
            Lance a peça consumida na OS e faça a baixa imediata do estoque.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="service-order-item-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <fieldset disabled={isSaving} className="grid gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peça *</FormLabel>
                    <FormControl>
                      <ProductAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Buscar peça por nome ou código"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor unitário *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            R$
                          </span>
                          <Input
                            value={field.value}
                            className="pl-10"
                            inputMode="numeric"
                            onChange={(event) =>
                              field.onChange(
                                formatServiceOrderCurrencyInput(event.target.value)
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-28"
                        placeholder="Opcional. Se vazio, o sistema usa o nome da peça."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            form="service-order-item-form"
            isLoading={isSaving}
            loadingLabel="Adicionando..."
          >
            Confirmar
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
