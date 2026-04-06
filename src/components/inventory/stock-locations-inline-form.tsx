"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import {
  defaultStockLocationFormValues,
  stockLocationFormSchema,
  type StockLocationFormValues,
  toStockLocationMutationInput,
} from "@/lib/inventory"
import { Button } from "@/components/ui/button"
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
import { toast } from "@/components/ui/toast"

export function StockLocationsInlineForm() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<StockLocationFormValues>({
    resolver: zodResolver(stockLocationFormSchema),
    defaultValues: defaultStockLocationFormValues,
  })

  async function handleSubmit(values: StockLocationFormValues) {
    try {
      setIsSaving(true)

      const payload = toStockLocationMutationInput(values)
      const response = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          responseData?.error ?? "Não foi possível criar o local."
        )
      }

      toast.success("Local de estoque criado com sucesso.")
      form.reset(defaultStockLocationFormValues)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o local."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto_auto]"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Estoque Principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex.: Área principal de armazenagem"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex items-end gap-3">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="mb-2 size-4 rounded border-border accent-primary"
                />
              </FormControl>
              <div className="pb-1">
                <FormLabel>Padrão</FormLabel>
                <FormDescription>Define o local principal.</FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-end gap-3">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="mb-2 size-4 rounded border-border accent-primary"
                />
              </FormControl>
              <div className="pb-1">
                <FormLabel>Ativo</FormLabel>
                <FormDescription>Disponível para operação.</FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex items-end">
          <Button type="submit" disabled={isSaving}>
            <Plus />
            {isSaving ? "Criando..." : "Criar local"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
