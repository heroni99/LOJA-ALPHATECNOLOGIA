"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleDollarSign } from "lucide-react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

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
import { toast } from "@/components/ui/toast"
import {
  accountSettlementFormSchema,
  defaultAccountSettlementFormValues,
  formatFinancialCurrencyInput,
  getFinancialPaymentMethodLabel,
  type AccountSettlementFormValues,
  toAccountSettlementMutationInput,
} from "@/lib/financial"
import { formatCurrencyInputFromCents } from "@/lib/products"

type AccountSettlementDialogProps = {
  endpoint: string
  label: string
  title: string
  description: string
  amountCents: number
}

const paymentMethods = [
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "BANK_TRANSFER",
  "BOLETO",
  "STORE_CREDIT",
  "OTHER",
] as const

export function AccountSettlementDialog({
  endpoint,
  label,
  title,
  description,
  amountCents,
}: AccountSettlementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<AccountSettlementFormValues>({
    resolver: zodResolver(accountSettlementFormSchema),
    defaultValues: {
      ...defaultAccountSettlementFormValues,
      amount: formatCurrencyInputFromCents(amountCents),
    },
  })

  async function handleSubmit(values: AccountSettlementFormValues) {
    try {
      setIsSaving(true)

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toAccountSettlementMutationInput(values)),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseData?.error ?? "Não foi possível concluir a liquidação.")
      }

      toast.success(`${label} registrada com sucesso.`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a liquidação."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CircleDollarSign />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={`settlement-${endpoint}`}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="settled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {getFinancialPaymentMethodLabel(method)}
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
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-24"
                      placeholder="Observações sobre a liquidação."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={`settlement-${endpoint}`}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
