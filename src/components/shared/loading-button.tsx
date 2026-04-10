"use client"

import type { ComponentProps, ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type LoadingButtonProps = ComponentProps<typeof Button> & {
  isLoading?: boolean
  loadingLabel?: string
  children: ReactNode
}

export function LoadingButton({
  isLoading = false,
  loadingLabel = "Aguarde...",
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
