"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilLine, Save, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import type { InventoryLocationOption } from "@/lib/inventory"
import {
  stockLocationFormSchema,
  type StockLocationFormValues,
  toStockLocationMutationInput,
} from "@/lib/inventory"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
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

type StockLocationInlineEditorProps = {
  location: InventoryLocationOption
}

export function StockLocationInlineEditor({
  location,
}: StockLocationInlineEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<StockLocationFormValues>({
    resolver: zodResolver(stockLocationFormSchema),
    defaultValues: {
      name: location.name,
      description: location.description ?? "",
      is_default: location.isDefault,
      active: location.active,
    },
  })

  async function handleSubmit(values: StockLocationFormValues) {
    try {
      setIsSaving(true)

      const response = await fetch(`/api/inventory/locations/${location.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toStockLocationMutationInput(values)),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível atualizar o local."
        )
      }

      toast.success("Local atualizado com sucesso.")
      setIsEditing(false)
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

  if (!isEditing) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        <PencilLine />
        Editar
      </Button>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-3">
        <fieldset disabled={isSaving} className="grid gap-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => {
                      const checked = event.target.checked
                      field.onChange(checked)

                      if (checked) {
                        form.setValue("active", true)
                      }
                    }}
                    className="size-4 rounded border-border accent-primary"
                  />
                </FormControl>
                <FormLabel>Padrão</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                    disabled={form.watch("is_default")}
                  />
                </FormControl>
                <FormLabel>Ativo</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Locais inativos saem dos formulários operacionais e permanecem apenas para
          consulta e histórico.
        </p>

        <div className="flex gap-2">
          <LoadingButton
            type="submit"
            size="sm"
            isLoading={isSaving}
            loadingLabel="Salvando..."
          >
            <Save />
            Salvar
          </LoadingButton>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              form.reset({
                name: location.name,
                description: location.description ?? "",
                is_default: location.isDefault,
                active: location.active,
              })
              setIsEditing(false)
            }}
          >
            <X />
            Cancelar
          </Button>
        </div>
        </fieldset>
      </form>
    </Form>
  )
}
