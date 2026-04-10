"use client"

import { useEffect, useState, type ReactNode } from "react"

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

type ConfirmDialogProps = {
  title: string
  description: ReactNode
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: "default" | "danger"
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  variant = "default",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  open,
  onOpenChange,
  trigger,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const isControlled = typeof open === "boolean"
  const resolvedOpen = isControlled ? open : internalOpen
  const resolvedLoading = isLoading || internalLoading

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    if (!nextOpen) {
      onCancel?.()
    }

    onOpenChange?.(nextOpen)
  }

  async function handleConfirm() {
    try {
      setInternalLoading(true)
      await onConfirm()
      handleOpenChange(false)
    } finally {
      setInternalLoading(false)
    }
  }

  useEffect(() => {
    if (!resolvedOpen) {
      setInternalLoading(false)
    }
  }, [resolvedOpen])

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={resolvedLoading}
          >
            {cancelLabel}
          </Button>
          <LoadingButton
            type="button"
            variant={variant === "danger" ? "destructive" : "default"}
            isLoading={resolvedLoading}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
