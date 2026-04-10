"use client"

import { useMemo, useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { ZodError } from "zod"

import {
  defaultCashCloseFormValues,
  defaultCashSupplyFormValues,
  defaultCashWithdrawalFormValues,
  formatCentsToBRL,
  formatSignedCentsToBRL,
  toCashCloseMutationInput,
  toCashSupplyMutationInput,
  toCashWithdrawalMutationInput,
} from "@/lib/cash"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { LoadingButton } from "@/components/shared/loading-button"
import { MoneyInput } from "@/components/shared/money-input"
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
import { Textarea } from "@/components/ui/textarea"

type CashActionsProps = {
  expectedAmountCents: number
}

function getValidationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  return parseApiError(error)
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

  const closeDifferenceCents = useMemo(
    () => closeValues.closing_amount - expectedAmountCents,
    [closeValues.closing_amount, expectedAmountCents]
  )

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
      throw createApiError(
        response.status,
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

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
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

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
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
        "Caixa fechado. Nova sessão aberta automaticamente."
      )
      setCloseOpen(false)
      setCloseValues(defaultCashCloseFormValues)
    } catch (error) {
      toast.error(getValidationMessage(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
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
              Adicione dinheiro à sessão atual e registre a origem do valor.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSupplySubmit}>
            <fieldset disabled={isSaving === "supply"} className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor *</label>
                <MoneyInput
                  value={supplyValues.amount}
                  onChange={(value) =>
                    setSupplyValues((current) => ({
                      ...current,
                      amount: value,
                    }))
                  }
                  placeholder="0,00"
                  disabled={isSaving === "supply"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descrição</label>
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
                <Button type="button" variant="outline" onClick={() => setSupplyOpen(false)}>
                  Cancelar
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving === "supply"}
                  loadingLabel="Salvando..."
                >
                  Confirmar
                </LoadingButton>
              </DialogFooter>
            </fieldset>
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
              Retire dinheiro da sessão atual e documente o motivo da saída.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleWithdrawalSubmit}>
            <fieldset disabled={isSaving === "withdrawal"} className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor *</label>
                <MoneyInput
                  value={withdrawalValues.amount}
                  onChange={(value) =>
                    setWithdrawalValues((current) => ({
                      ...current,
                      amount: value,
                    }))
                  }
                  placeholder="0,00"
                  disabled={isSaving === "withdrawal"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Motivo *</label>
                <Textarea
                  value={withdrawalValues.reason}
                  className="min-h-28"
                  placeholder="Ex.: retirada para despesa, depósito ou recolhimento."
                  onChange={(event) =>
                    setWithdrawalValues((current) => ({
                      ...current,
                      reason: event.target.value,
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
                <LoadingButton
                  type="submit"
                  isLoading={isSaving === "withdrawal"}
                  loadingLabel="Salvando..."
                >
                  Confirmar
                </LoadingButton>
              </DialogFooter>
            </fieldset>
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
              Confira o valor esperado, informe o valor contado e finalize a sessão atual.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCloseSubmit}>
            <fieldset disabled={isSaving === "close"} className="grid gap-4">
              <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Valor esperado</span>
                  <strong className="text-foreground">
                    {formatCentsToBRL(expectedAmountCents)}
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor contado *</label>
                <MoneyInput
                  value={closeValues.closing_amount}
                  onChange={(value) =>
                    setCloseValues((current) => ({
                      ...current,
                      closing_amount: value,
                    }))
                  }
                  placeholder="0,00"
                  disabled={isSaving === "close"}
                />
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Diferença</span>
                  <strong
                    className={cn(
                      closeDifferenceCents === 0 && "text-emerald-700",
                      closeDifferenceCents !== 0 && "text-red-700"
                    )}
                  >
                    {formatSignedCentsToBRL(closeDifferenceCents)}
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observações</label>
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
                <Button type="button" variant="outline" onClick={() => setCloseOpen(false)}>
                  Cancelar
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving === "close"}
                  loadingLabel="Fechando..."
                >
                  Confirmar fechamento
                </LoadingButton>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
