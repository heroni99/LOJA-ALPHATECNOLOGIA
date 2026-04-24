"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Printer } from "lucide-react"

import { FiscalCancelButton } from "@/components/fiscal/fiscal-cancel-button"
import { LoadingButton } from "@/components/shared/loading-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getFiscalStatusClasses, getFiscalStatusLabel, type FiscalDocumentSummary } from "@/lib/fiscal"
import { parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { toast } from "@/lib/toast"

type GenerateFiscalApiResponse = {
  data?: {
    id: string
    receiptNumber: string
    status: "ISSUED" | "CANCELLED"
  }
  error?: string
}

type SaleFiscalCardProps = {
  saleId: string
  fiscalDocument: FiscalDocumentSummary | null
}

export function SaleFiscalCard({
  saleId,
  fiscalDocument,
}: SaleFiscalCardProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    try {
      setIsGenerating(true)

      const response = await fetch("/api/fiscal/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sale_id: saleId }),
      })
      const responseData = (await response.json()) as GenerateFiscalApiResponse

      if (!response.ok || !responseData.data) {
        throw {
          status: response.status,
          error: responseData.error ?? "Não foi possível gerar o comprovante.",
        }
      }

      toast.success(`Comprovante ${responseData.data.receiptNumber} disponível.`)
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsGenerating(false)
    }
  }

  if (!fiscalDocument) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-border/80 bg-muted/10 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Nenhum comprovante emitido para esta venda.
          </p>
          <p className="text-sm text-muted-foreground">
            Gere um comprovante REC para impressão e controle interno.
          </p>
        </div>

        <div>
          <LoadingButton
            type="button"
            isLoading={isGenerating}
            onClick={() => void handleGenerate()}
          >
            Gerar comprovante
          </LoadingButton>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/70 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-lg font-semibold text-foreground">
          {fiscalDocument.receiptNumber}
        </p>
        <Badge className={getFiscalStatusClasses(fiscalDocument.status)}>
          {getFiscalStatusLabel(fiscalDocument.status)}
        </Badge>
      </div>

      <div className="grid gap-1 text-sm text-muted-foreground">
        <p>Emitido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(fiscalDocument.issuedAt))}</p>
        {fiscalDocument.cancelReason ? (
          <p>Motivo do cancelamento: {fiscalDocument.cancelReason}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link
            href={`/api/fiscal/${fiscalDocument.id}/receipt`}
            target="_blank"
            rel="noreferrer"
          >
            <Printer />
            Imprimir comprovante
          </Link>
        </Button>
        {fiscalDocument.status === "ISSUED" ? (
          <FiscalCancelButton
            documentId={fiscalDocument.id}
            receiptNumber={fiscalDocument.receiptNumber}
          />
        ) : null}
      </div>
    </div>
  )
}
