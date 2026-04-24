"use client"

import { useState, type ComponentProps } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"

type CancelFiscalApiResponse = {
  error?: string
}

type FiscalCancelButtonProps = {
  documentId: string
  receiptNumber: string
  label?: string
  size?: ComponentProps<typeof Button>["size"]
  variant?: ComponentProps<typeof Button>["variant"]
  className?: string
}

export function FiscalCancelButton({
  documentId,
  receiptNumber,
  label = "Cancelar",
  size = "sm",
  variant = "outline",
  className,
}: FiscalCancelButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCancel() {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/fiscal/${documentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })
      const responseData = (await response.json()) as CancelFiscalApiResponse

      if (!response.ok) {
        throw {
          status: response.status,
          error: responseData.error ?? "Não foi possível cancelar o comprovante.",
        }
      }

      toast.success(`Comprovante ${receiptNumber} cancelado.`)
      setOpen(false)
      setReason("")
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          setReason("")
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className={className}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar comprovante</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento do comprovante {receiptNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label
            htmlFor={`cancel-reason-${documentId}`}
            className="text-sm font-medium text-foreground"
          >
            Motivo
          </label>
          <Textarea
            id={`cancel-reason-${documentId}`}
            value={reason}
            placeholder="Descreva o motivo do cancelamento."
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Fechar
          </Button>
          <LoadingButton
            type="button"
            variant="destructive"
            isLoading={isSubmitting}
            onClick={() => void handleCancel()}
          >
            Confirmar cancelamento
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
