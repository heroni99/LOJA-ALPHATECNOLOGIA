"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useForm } from "react-hook-form"

import type { InventoryLocationOption } from "@/lib/inventory"
import {
  defaultInventoryTransferFormValues,
  inventoryTransferFormSchema,
  type InventoryTransferFormValues,
  toInventoryTransferMutationInput,
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

type InventoryTransferFormProps = {
  locations: InventoryLocationOption[]
}

export function InventoryTransferForm({
  locations,
}: InventoryTransferFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<InventoryTransferFormValues>({
    resolver: zodResolver(inventoryTransferFormSchema),
    defaultValues: defaultInventoryTransferFormValues,
  })

  async function handleSubmit(values: InventoryTransferFormValues) {
    try {
      setIsSaving(true)

      const payload = toInventoryTransferMutationInput(values)
      const response = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          responseData?.error ?? "Não foi possível registrar a transferência."
        )
      }

      toast.success("Transferência de estoque registrada com sucesso.")
      router.push("/inventory")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a transferência."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title="Transferência de estoque"
      description="Movimente saldo entre dois locais, mantendo o histórico completo da saída e da entrada."
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            form="inventory-transfer-form"
            disabled={isSaving}
          >
            <Save />
            {isSaving ? "Confirmando..." : "Confirmar transferência"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="inventory-transfer-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Transferência</CardTitle>
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
                name="from_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local de origem *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
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
                        className="min-h-36"
                        placeholder="Informações operacionais sobre a transferência."
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
