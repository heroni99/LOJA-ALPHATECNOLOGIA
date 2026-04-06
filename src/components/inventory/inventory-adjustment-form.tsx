"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import type { InventoryLocationOption } from "@/lib/inventory"
import {
  defaultInventoryAdjustmentFormValues,
  inventoryAdjustmentFormSchema,
  type InventoryAdjustmentFormValues,
  toInventoryAdjustmentMutationInput,
} from "@/lib/inventory"
import { ProductAutocomplete } from "@/components/inventory/product-autocomplete"
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

type InventoryAdjustmentFormProps = {
  locations: InventoryLocationOption[]
}

export function InventoryAdjustmentForm({
  locations,
}: InventoryAdjustmentFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues: defaultInventoryAdjustmentFormValues,
  })

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
        throw new Error(
          responseData?.error ?? "Não foi possível registrar o ajuste."
        )
      }

      toast.success("Ajuste de estoque registrado com sucesso.")
      router.push("/inventory")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o ajuste."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title="Ajuste de estoque"
      description="Atualize o saldo real do produto em um local específico e registre o motivo da correção."
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            form="inventory-adjustment-form"
            disabled={isSaving}
          >
            <Save />
            {isSaving ? "Confirmando..." : "Confirmar ajuste"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="inventory-adjustment-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Ajuste</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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

              <FormField
                control={form.control}
                name="new_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade nova *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
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
                name="reason"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Motivo do ajuste *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-36"
                        placeholder="Explique a divergência encontrada, inventário ou correção realizada."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </FormPage>
  )
}
