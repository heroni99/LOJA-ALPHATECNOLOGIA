"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  defaultPurchaseOrderFormValues,
  defaultPurchaseOrderItemFormValues,
  formatPurchaseOrderCurrencyInput,
  purchaseOrderFormSchema,
  type PurchaseOrderFormProductOption,
  type PurchaseOrderFormSupplierOption,
  type PurchaseOrderFormValues,
  toPurchaseOrderMutationInput,
} from "@/lib/purchase-orders"

type PurchaseOrderFormProps = {
  mode: "create" | "edit"
  suppliers: PurchaseOrderFormSupplierOption[]
  products: PurchaseOrderFormProductOption[]
  initialValues?: PurchaseOrderFormValues
  purchaseOrderId?: string
  orderNumber?: string
}

export function PurchaseOrderForm({
  mode,
  suppliers,
  products,
  initialValues = defaultPurchaseOrderFormValues,
  purchaseOrderId,
  orderNumber,
}: PurchaseOrderFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: initialValues,
  })
  const itemsFieldArray = useFieldArray({
    control: form.control,
    name: "items",
  })

  async function handleSubmit(values: PurchaseOrderFormValues) {
    try {
      setIsSaving(true)

      const payload = toPurchaseOrderMutationInput(values)
      const response = await fetch(
        mode === "create"
          ? "/api/purchase-orders"
          : `/api/purchase-orders/${purchaseOrderId}`,
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
        throw new Error(
          responseData?.error ?? "Não foi possível salvar o pedido de compra."
        )
      }

      toast.success(
        mode === "create"
          ? "Pedido de compra criado com sucesso."
          : "Pedido de compra atualizado com sucesso."
      )

      router.push(`/purchase-orders/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o pedido de compra."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo pedido de compra" : "Editar pedido de compra"}
      description="Monte o pedido com fornecedor, itens, quantidades e custo unitário para emissão e posterior recebimento."
      titleSlot={
        orderNumber ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {orderNumber}
          </span>
        ) : null
      }
      footer={
        <>
          <Button variant="outline" asChild>
            <Link
              href={
                mode === "create"
                  ? "/purchase-orders"
                  : `/purchase-orders/${purchaseOrderId}`
              }
            >
              Cancelar
            </Link>
          </Button>
          <Button type="submit" form="purchase-order-form" disabled={isSaving}>
            <Save />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="purchase-order-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Fornecedor e observações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
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
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-24"
                        placeholder="Condições comerciais, prazo combinado ou observações do fornecedor."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Itens</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  itemsFieldArray.append({ ...defaultPurchaseOrderItemFormValues })
                }
              >
                <Plus />
                Adicionar item
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              {itemsFieldArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-4 md:grid-cols-12"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.product_id`}
                    render={({ field: itemField }) => (
                      <FormItem className="md:col-span-5">
                        <FormLabel>Produto *</FormLabel>
                        <Select
                          value={itemField.value}
                          onValueChange={itemField.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.label}
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
                    name={`items.${index}.quantity`}
                    render={({ field: itemField }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Qtd. *</FormLabel>
                        <FormControl>
                          <Input
                            {...itemField}
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
                    name={`items.${index}.unit_cost`}
                    render={({ field: itemField }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>Custo *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R$
                            </span>
                            <Input
                              value={itemField.value}
                              className="pl-10"
                              inputMode="numeric"
                              onChange={(event) =>
                                itemField.onChange(
                                  formatPurchaseOrderCurrencyInput(event.target.value)
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={itemsFieldArray.fields.length === 1}
                      onClick={() => itemsFieldArray.remove(index)}
                    >
                      <Trash2 />
                      Remover
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: itemField }) => (
                      <FormItem className="md:col-span-12">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input
                            {...itemField}
                            placeholder="Opcional. Se vazio, o sistema usa o produto selecionado."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </form>
      </Form>
    </FormPage>
  )
}
