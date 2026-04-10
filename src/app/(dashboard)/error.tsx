"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Não foi possível carregar a página."
      description={error.message || "Tente novamente em instantes."}
      action={
        <Button type="button" onClick={reset}>
          <RefreshCw />
          Tentar novamente
        </Button>
      }
      className="min-h-[60vh]"
    />
  )
}
