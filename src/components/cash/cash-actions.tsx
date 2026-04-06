"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ZodError } from "zod"

import {
  defaultCashCloseFormValues,
  defaultCashSupplyFormValues,
  defaultCashWithdrawalFormValues,
  formatCashCurrencyInput,
  formatCentsToBRL,
  formatSignedCentsToBRL,
  toCashCloseMutationInput,
  toCashSupplyMutationInput,
  toCashWithdrawalMutationInput,
} from "@/lib/cash"
import { cn } from "@/lib/utils"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"

type CashActionsProps = {
  expectedAmountCents: number
}

function getValidationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a operação."
}

export function CashActions({ expectedAmountCents }: CashActionsProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState<"supply" | "withdrawal" | "close" | null>(
    null
  )
  const [supplyOpen, setSupplyOpen] = useState(false)
  const [withdrawalOpen, setWithdrawalOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [supplyValues, setSupplyValues] = useState(defaultCashSupplyFormValues)
  const [withdrawalValues, setWithdrawalValues] = useState(
    defaultCashWithdrawalFormValues
  )
  const [closeValues, setCloseValues] = useState(defaultCashCloseFormValues)

  const closeDifferenceCents = useMemo(() => {
    try {
      return toCashCloseMutationInput(closeValues).closing_amount - expectedAmountCents
    } catch {
      return -expectedAmountCents
    }
  }, [closeValues, expectedAmountCents])

  async function submitRequest(
    endpoint: string,
    payload: Record<string, unknown>,
    successMessage: string
  ) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    const responseData = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        responseData?.error ?? "Não foi possível processar a operação."
      )
    }

    toast.success(successMessage)
    router.refresh()
  }

  async function handleSupplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSaving("supply")
      const payload = toCashSupplyMutationInput(supplyValues)
      await submitRequest(
        "/api/cash/supply",
        payload,
        "Suprimento registrado com sucesso."
      )
      setSupplyOpen(false)
      setSupplyValues(defaultCashSupplyFormValues)
    } catch (error) {
      toast.error(getValidationMessage(error))
    } finally {
      setIsSaving(null)
    }
  }

  async function handleWithdrawalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSaving("withdrawal")
      const payload = toCashWithdrawalMutationInput(withdrawalValues)
      await submitRequest(
        "/api/cash/withdrawal",
        payload,
        "Sangria registrada com sucesso."
      )
      setWithdrawalOpen(false)
      setWithdrawalValues(defaultCashWithdrawalFormValues)
    } catch (error) {
      toast.error(getValidationMessage(error))
    } finally {
      setIsSaving(null)
    }
  }

  async function handleCloseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSaving("close")
      const payload = toCashCloseMutationInput(closeValues)
      await submitRequest(
        "/api/cash/close",
        payload,
        "Caixa fechado com sucesso."
      )
      setCloseOpen(false)
      setCloseValues(defaultCashCloseFormValues)
    } catch (error) {
      toast.error(getValidationMessage(error))
    } finally {
      setIsSaving(null)
    }
  }

  return (
    <>
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <ArrowUpCircle />
            Suprimento
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar suprimento</DialogTitle>
            <DialogDescription>
              Adicione dinheiro ao caixa atual e registre a origem do valor.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSupplySubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Valor *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  value={supplyValues.amount}
                  className="pl-10"
                  inputMode="numeric"
                  onChange={(event) =>
                    setSupplyValues((current) => ({
                      ...current,
                      amount: formatCashCurrencyInput(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Descrição *
              </label>
              <Textarea
                value={supplyValues.description}
                className="min-h-28"
                placeholder="Ex.: reforço para troco do turno."
                onChange={(event) =>
                  setSupplyValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplyOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving === "supply"}>
                {isSaving === "supply" ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <ArrowDownCircle />
            Sangria
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar sangria</DialogTitle>
            <DialogDescription>
              Retire dinheiro do caixa atual e documente o motivo da saída.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleWithdrawalSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Valor *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  value={withdrawalValues.amount}
                  className="pl-10"
                  inputMode="numeric"
                  onChange={(event) =>
                    setWithdrawalValues((current) => ({
                      ...current,
                      amount: formatCashCurrencyInput(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Motivo *
              </label>
              <Textarea
                value={withdrawalValues.description}
                className="min-h-28"
                placeholder="Ex.: retirada para despesa, depósito ou recolhimento."
                onChange={(event) =>
                  setWithdrawalValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving === "withdrawal"}>
                {isSaving === "withdrawal" ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogTrigger asChild>
          <Button>
            <Receipt />
            Fechar caixa
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Informe o valor contado. A diferença é calculada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCloseSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Valor contado *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  value={closeValues.closing_amount}
                  className="pl-10"
                  inputMode="numeric"
                  onChange={(event) =>
                    setCloseValues((current) => ({
                      ...current,
                      closing_amount: formatCashCurrencyInput(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Esperado</span>
                <strong className="text-foreground">
                  {formatCentsToBRL(expectedAmountCents)}
                </strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Diferença</span>
                <strong
                  className={cn(
                    closeDifferenceCents > 0 && "text-emerald-700",
                    closeDifferenceCents < 0 && "text-red-700",
                    closeDifferenceCents === 0 && "text-foreground"
                  )}
                >
                  {formatSignedCentsToBRL(closeDifferenceCents)}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Observações
              </label>
              <Textarea
                value={closeValues.notes}
                className="min-h-24"
                placeholder="Opcional: observações do fechamento."
                onChange={(event) =>
                  setCloseValues((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving === "close"}>
                {isSaving === "close" ? "Fechando..." : "Confirmar fechamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
