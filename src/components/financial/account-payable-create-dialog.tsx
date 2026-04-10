"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  accountPayableCreateFormSchema,
  defaultAccountPayableCreateFormValues,
  formatFinancialCurrencyInput,
  type AccountPayableCreateFormValues,
  toAccountPayableMutationInput,
} from "@/lib/financial"
import { toast } from "@/lib/toast"
import type { PurchaseOrderFormSupplierOption } from "@/lib/purchase-orders"

type AccountPayableCreateDialogProps = {
  suppliers: PurchaseOrderFormSupplierOption[]
}

export function AccountPayableCreateDialog({
  suppliers,
}: AccountPayableCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<AccountPayableCreateFormValues>({
    resolver: zodResolver(accountPayableCreateFormSchema),
    defaultValues: defaultAccountPayableCreateFormValues,
  })

  async function handleSubmit(values: AccountPayableCreateFormValues) {
    try {
      setIsSaving(true)

      const response = await fetch("/api/accounts-payable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toAccountPayableMutationInput(values)),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível criar a conta a pagar."
        )
      }

      toast.success("Conta a pagar criada com sucesso.")
      setOpen(false)
      form.reset(defaultAccountPayableCreateFormValues)
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
          Nova conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
          <DialogDescription>
            Lance compromissos avulsos ou despesas não vinculadas a pedidos de compra.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="accounts-payable-create-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <fieldset disabled={isSaving} className="grid gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem fornecedor</SelectItem>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex.: Compra emergencial de acessórios" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
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
                                formatFinancialCurrencyInput(event.target.value)
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-24" />
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
            form="accounts-payable-create-form"
            isLoading={isSaving}
            loadingLabel="Salvando..."
          >
            Criar conta
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
