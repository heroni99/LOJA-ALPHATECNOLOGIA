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
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"

export function StockLocationCreateDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<StockLocationFormValues>({
    resolver: zodResolver(stockLocationFormSchema),
    defaultValues: defaultStockLocationFormValues,
  })

  async function handleSubmit(values: StockLocationFormValues) {
    try {
      setIsSaving(true)

      const response = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          toStockLocationMutationInput({
            ...values,
            active: true,
          })
        ),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível criar o local."
        )
      }

      toast.success("Local de estoque criado com sucesso.")
      setOpen(false)
      form.reset(defaultStockLocationFormValues)
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
        <Button>
          <Plus />
          Novo local
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo local de estoque</DialogTitle>
          <DialogDescription>
            Cadastre o local físico que poderá receber entradas, ajustes e transferências. Novos locais são criados como ativos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="stock-location-create-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <fieldset disabled={isSaving} className="grid gap-4">
              <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Estoque principal" {...field} />
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
                    <Input placeholder="Ex.: Área principal de armazenagem" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                  </FormControl>
                  <FormLabel>Definir como local padrão</FormLabel>
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
            form="stock-location-create-form"
            isLoading={isSaving}
            loadingLabel="Criando..."
          >
            Criar local
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
