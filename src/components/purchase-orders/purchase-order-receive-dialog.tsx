"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Boxes, Download } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  purchaseOrderReceiveFormSchema,
  type PurchaseOrderItemSummary,
  type PurchaseOrderReceiveFormValues,
  toPurchaseOrderReceiveFormValues,
  toPurchaseOrderReceiveMutationInput,
} from "@/lib/purchase-orders"

type PurchaseOrderReceiveDialogProps = {
  purchaseOrderId: string
  items: PurchaseOrderItemSummary[]
  disabled?: boolean
}

export function PurchaseOrderReceiveDialog({
  purchaseOrderId,
  items,
  disabled = false,
}: PurchaseOrderReceiveDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<PurchaseOrderReceiveFormValues>({
    resolver: zodResolver(purchaseOrderReceiveFormSchema),
    defaultValues: toPurchaseOrderReceiveFormValues(items),
  })

  async function handleSubmit(values: PurchaseOrderReceiveFormValues) {
    try {
      setIsSaving(true)

      const payload = toPurchaseOrderReceiveMutationInput(values)
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/receive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          responseData?.error ?? "Não foi possível registrar o recebimento."
        )
      }

      toast.success("Recebimento registrado com sucesso.")
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Download />
          Receber itens
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receber pedido</DialogTitle>
          <DialogDescription>
            Informe as quantidades recebidas. O sistema atualiza o estoque, gera
            movimentações e cria automaticamente o contas a pagar do lote.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="purchase-order-receive-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento do contas a pagar *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
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
                        placeholder="Informações da conferência, nota fiscal ou divergências."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4 md:grid-cols-[minmax(0,1fr)_150px_180px]"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Saldo pendente: {item.remainingQuantity}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Boxes className="mb-1 size-4 text-primary" />
                    Recebido: {item.receivedQuantity} / {item.quantity}
                  </div>
                  <FormField
                    control={form.control}
                    name={`items.${index}.received_quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade recebida</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max={item.remainingQuantity}
                            step="0.001"
                            inputMode="decimal"
                            disabled={item.remainingQuantity <= 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="purchase-order-receive-form"
            disabled={isSaving}
          >
            {isSaving ? "Recebendo..." : "Confirmar recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
