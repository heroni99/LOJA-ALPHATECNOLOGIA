"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ClipboardCheck, PackageCheck, ThumbsDown, ThumbsUp, Wrench } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  defaultServiceOrderDiagnosisFormValues,
  formatServiceOrderCurrencyInput,
  type ServiceOrderDetail,
  type ServiceOrderDiagnosisFormValues,
  type ServiceOrderStatus,
  serviceOrderDiagnosisFormSchema,
  toServiceOrderDiagnosisFormValues,
  toServiceOrderDiagnosisUpdateInput,
  toServiceOrderStatusChangeInput,
} from "@/lib/service-orders"
import { toast } from "@/lib/toast"

type ServiceOrderActionsProps = {
  serviceOrder: Pick<
    ServiceOrderDetail,
    | "id"
    | "status"
    | "foundIssue"
    | "technicalNotes"
    | "estimatedCompletionDate"
    | "totalEstimatedCents"
  >
}

export function ServiceOrderActions({
  serviceOrder,
}: ServiceOrderActionsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [diagnosisOpen, setDiagnosisOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNotes, setRejectNotes] = useState("")
  const diagnosisForm = useForm<ServiceOrderDiagnosisFormValues>({
    resolver: zodResolver(serviceOrderDiagnosisFormSchema),
    defaultValues: defaultServiceOrderDiagnosisFormValues,
  })

  useEffect(() => {
    diagnosisForm.reset(toServiceOrderDiagnosisFormValues(serviceOrder))
  }, [diagnosisForm, serviceOrder])

  async function handleStatusChange(
    newStatus: ServiceOrderStatus,
    notes?: string
  ) {
    try {
      setIsSubmitting(newStatus)

      const response = await fetch(`/api/service-orders/${serviceOrder.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toServiceOrderStatusChangeInput(newStatus, notes)),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível atualizar a OS."
        )
      }

      toast.success("Status da OS atualizado com sucesso.")
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSubmitting(null)
    }
  }

  async function handleDiagnosisSubmit(values: ServiceOrderDiagnosisFormValues) {
    try {
      setIsSubmitting("WAITING_APPROVAL")

      const patchResponse = await fetch(`/api/service-orders/${serviceOrder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toServiceOrderDiagnosisUpdateInput(values)),
      })
      const patchData = await patchResponse.json().catch(() => null)

      if (!patchResponse.ok) {
        throw createApiError(
          patchResponse.status,
          patchData?.error ?? "Não foi possível salvar o diagnóstico."
        )
      }

      const statusResponse = await fetch(
        `/api/service-orders/${serviceOrder.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            toServiceOrderStatusChangeInput(
              "WAITING_APPROVAL",
              values.status_notes
            )
          ),
        }
      )
      const statusData = await statusResponse.json().catch(() => null)

      if (!statusResponse.ok) {
        throw createApiError(
          statusResponse.status,
          statusData?.error ?? "Não foi possível mover a OS para aprovação."
        )
      }

      toast.success("Diagnóstico registrado e OS enviada para aprovação.")
      setDiagnosisOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSubmitting(null)
    }
  }

  if (serviceOrder.status === "OPEN") {
    return (
      <Dialog open={diagnosisOpen} onOpenChange={setDiagnosisOpen}>
        <DialogTrigger asChild>
          <Button>
            <ClipboardCheck />
            Registrar diagnóstico
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar diagnóstico</DialogTitle>
            <DialogDescription>
              Informe o problema encontrado, o orçamento e o prazo estimado. Ao
              salvar, a OS muda para aguardando aprovação.
            </DialogDescription>
          </DialogHeader>

          <Form {...diagnosisForm}>
            <form
              id="service-order-diagnosis-form"
              onSubmit={diagnosisForm.handleSubmit(handleDiagnosisSubmit)}
              className="grid gap-4"
            >
              <fieldset disabled={isSubmitting === "WAITING_APPROVAL"} className="grid gap-4">
                <FormField
                  control={diagnosisForm.control}
                  name="found_issue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-28"
                          placeholder="Descreva o defeito encontrado pela equipe técnica."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={diagnosisForm.control}
                  name="technical_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas técnicas</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-24"
                          placeholder="Testes realizados, observações internas e cuidados necessários."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={diagnosisForm.control}
                    name="estimated_completion_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo estimado</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={diagnosisForm.control}
                    name="total_estimated"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orçamento *</FormLabel>
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
                                  formatServiceOrderCurrencyInput(event.target.value)
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={diagnosisForm.control}
                  name="status_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observação do histórico</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-24"
                          placeholder="Mensagem opcional para registrar na timeline."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
            </form>
          </Form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagnosisOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              form="service-order-diagnosis-form"
              isLoading={isSubmitting === "WAITING_APPROVAL"}
              loadingLabel="Salvando..."
            >
              Salvar diagnóstico
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (serviceOrder.status === "WAITING_APPROVAL") {
    return (
      <>
        <Button
          disabled={isSubmitting === "APPROVED"}
          onClick={() => handleStatusChange("APPROVED")}
        >
          <ThumbsUp />
          {isSubmitting === "APPROVED" ? "Aprovando..." : "Aprovar"}
        </Button>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <ThumbsDown />
              Rejeitar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar orçamento</DialogTitle>
              <DialogDescription>
                Registre um motivo opcional antes de encerrar a OS como rejeitada.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectNotes}
              className="min-h-28"
              placeholder="Motivo opcional da rejeição."
              onChange={(event) => setRejectNotes(event.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <LoadingButton
                variant="destructive"
                isLoading={isSubmitting === "REJECTED"}
                loadingLabel="Rejeitando..."
                onClick={async () => {
                  await handleStatusChange("REJECTED", rejectNotes)
                  setRejectOpen(false)
                  setRejectNotes("")
                }}
              >
                Confirmar
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (serviceOrder.status === "APPROVED") {
    return (
      <Button
        disabled={isSubmitting === "IN_PROGRESS"}
        onClick={() => handleStatusChange("IN_PROGRESS")}
      >
        <Wrench />
        {isSubmitting === "IN_PROGRESS" ? "Iniciando..." : "Iniciar serviço"}
      </Button>
    )
  }

  if (serviceOrder.status === "IN_PROGRESS") {
    return (
      <Button
        disabled={isSubmitting === "READY_FOR_DELIVERY"}
        onClick={() => handleStatusChange("READY_FOR_DELIVERY")}
      >
        <PackageCheck />
        {isSubmitting === "READY_FOR_DELIVERY"
          ? "Atualizando..."
          : "Pronto para entrega"}
      </Button>
    )
  }

  if (serviceOrder.status === "READY_FOR_DELIVERY") {
    return (
      <Button
        disabled={isSubmitting === "DELIVERED"}
        onClick={() => handleStatusChange("DELIVERED")}
      >
        <ClipboardCheck />
        {isSubmitting === "DELIVERED"
          ? "Registrando..."
          : "Registrar entrega"}
      </Button>
    )
  }

  return null
}
