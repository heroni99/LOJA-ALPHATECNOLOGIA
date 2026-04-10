"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban } from "lucide-react"

import { parseApiError, createApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

type DeactivateRecordButtonProps = {
  endpoint: string
  redirectHref: string
  confirmMessage: string
  successMessage: string
  errorMessage: string
  label: string
}

export function DeactivateRecordButton({
  endpoint,
  redirectHref,
  confirmMessage,
  successMessage,
  errorMessage,
  label,
}: DeactivateRecordButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleClick() {
    try {
      setIsSubmitting(true)

      const response = await fetch(endpoint, { method: "DELETE" })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(response.status, responseData?.error ?? errorMessage)
      }

      toast.success(successMessage)
      router.push(redirectHref)
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
    <ConfirmDialog
      title={label}
      description={confirmMessage}
      variant="danger"
      confirmLabel={label}
      isLoading={isSubmitting}
      onConfirm={handleClick}
      trigger={
        <Button type="button" variant="destructive">
          <Ban />
          {label}
        </Button>
      }
    />
  )
}
