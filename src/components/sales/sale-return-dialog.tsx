"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightLeft } from "lucide-react"
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
import { formatCentsToBRL } from "@/lib/products"
import {
  type SaleDetailItem,
} from "@/lib/sales"
import {
  type SaleReturnFormValues,
  getSaleReturnRefundTypeLabel,
  toSaleReturnMutationInput,
  saleReturnFormSchema,
} from "@/lib/sale-returns"

type SaleReturnDialogProps = {
  saleId: string
  saleNumber: string
  items: SaleDetailItem[]
  disabled?: boolean
}

export function SaleReturnDialog({
  saleId,
  saleNumber,
  items,
  disabled = false,
}: SaleReturnDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<SaleReturnFormValues>({
    resolver: zodResolver(saleReturnFormSchema),
    defaultValues: {
      items: items.map((item) => ({
        sale_item_id: item.id,
        description: `${item.internalCode} - ${item.name}`,
        max_quantity: item.availableReturnQuantity,
        quantity: item.availableReturnQuantity > 0 ? "0" : "0",
      })),
      reason: "",
      refund_type: "CASH",
    },
  })

  const watchedItems = form.watch("items")
  const refundType = form.watch("refund_type")
  const selectedItems = useMemo(() => {
    return watchedItems
      .map((item, index) => ({
        item,
        detail: items[index],
        quantity: Number(item.quantity.replace(",", ".")) || 0,
      }))
      .filter((entry) => entry.quantity > 0)
  }, [items, watchedItems])
  const totalCents = selectedItems.reduce(
    (sum, entry) =>
      sum + Math.round(entry.quantity * entry.detail.unitPriceCents),
    0
  )

  async function handleConfirm(values: SaleReturnFormValues) {
    try {
      setIsSubmitting(true)

      const payload = toSaleReturnMutationInput(saleId, values)
      const response = await fetch("/api/sale-returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          responseData?.error ?? "Não foi possível concluir a devolução."
        )
      }

      toast.success("Devolução registrada com sucesso.")
      setOpen(false)
      setStep(1)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a devolução."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetDialog() {
    setOpen(false)
    setStep(1)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : resetDialog())}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <ArrowRightLeft />
          Registrar devolução
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Devolução da venda {saleNumber}</DialogTitle>
          <DialogDescription>
            Selecione os itens, informe a resolução e confirme o estorno.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="sale-return-form"
            onSubmit={form.handleSubmit(handleConfirm)}
            className="grid gap-4"
          >
            {step === 1 ? (
              <div className="grid gap-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4 md:grid-cols-[minmax(0,1fr)_160px]"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.internalCode} - {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vendido: {item.quantity} • Já devolvido: {item.returnedQuantity} •
                        Disponível: {item.availableReturnQuantity}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max={item.availableReturnQuantity}
                              step="0.001"
                              inputMode="decimal"
                              disabled={item.availableReturnQuantity <= 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="refund_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de resolução *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a resolução" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                          <SelectItem value="STORE_CREDIT">Crédito</SelectItem>
                          <SelectItem value="EXCHANGE">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-28"
                          placeholder="Descreva o motivo da devolução."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4 rounded-3xl border border-border/70 bg-background/80 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Itens selecionados
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {selectedItems.map((entry) => (
                      <div
                        key={entry.item.sale_item_id}
                        className="flex justify-between gap-4"
                      >
                        <span>
                          {entry.item.description} • {entry.quantity}
                        </span>
                        <strong className="text-foreground">
                          {formatCentsToBRL(
                            Math.round(entry.quantity * entry.detail.unitPriceCents)
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 text-sm">
                  <p>
                    <strong>Resolução:</strong>{" "}
                    {getSaleReturnRefundTypeLabel(refundType)}
                  </p>
                  <p>
                    <strong>Motivo:</strong> {form.getValues("reason")}
                  </p>
                  <p className="text-base">
                    <strong>Total da devolução:</strong> {formatCentsToBRL(totalCents)}
                  </p>
                </div>
              </div>
            ) : null}
          </form>
        </Form>

        <DialogFooter>
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((current) => current - 1)}>
              Voltar
            </Button>
          ) : (
            <Button variant="outline" onClick={resetDialog}>
              Cancelar
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={async () => {
                const fieldNames =
                  step === 1
                    ? (["items"] as const)
                    : (["refund_type", "reason"] as const)
                const valid = await form.trigger(fieldNames)

                if (valid) {
                  setStep((current) => current + 1)
                }
              }}
            >
              Próximo
            </Button>
          ) : (
            <Button
              type="submit"
              form="sale-return-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processando..." : "Confirmar devolução"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
