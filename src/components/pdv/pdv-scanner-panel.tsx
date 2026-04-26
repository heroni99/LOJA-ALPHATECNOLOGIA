"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, QrCode } from "lucide-react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"

import { LoadingButton } from "@/components/shared/loading-button"
import { Badge } from "@/components/ui/badge"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { formatCentsToBRL } from "@/lib/products"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { PdvSearchResult } from "@/lib/pdv"
import {
  getScannerChannelName,
  type ScannerBroadcastPayload,
  type ScannerPairedPayload,
  type ScannerSession,
} from "@/lib/scanner"
import { toast } from "@/lib/toast"

type ScannerSessionApiResponse = {
  data?: ScannerSession
  error?: string
}

type PdvScannerPanelProps = {
  onProductScanned: (product: PdvSearchResult) => boolean
  onSessionChange?: (session: ScannerSession | null) => void
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"])

function getScannerStatusLabel(status: ScannerSession["status"]) {
  const labels = {
    WAITING: "Aguardando celular",
    CONNECTED: "Celular conectado",
    CLOSED: "Encerrada",
  } satisfies Record<ScannerSession["status"], string>

  return labels[status]
}

function getScannerStatusClasses(status: ScannerSession["status"]) {
  switch (status) {
    case "CONNECTED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
    case "CLOSED":
      return "border-slate-300 bg-slate-100 text-slate-600"
    default:
      return "border-amber-500/20 bg-amber-500/10 text-amber-700"
  }
}

function buildScannerUrl(baseUrl: string, pairingCode: string) {
  const url = new URL("/scanner", baseUrl)

  url.searchParams.set("code", pairingCode)

  return url.toString()
}

export function PdvScannerPanel({
  onProductScanned,
  onSessionChange,
}: PdvScannerPanelProps) {
  const router = useRouter()
  const onProductScannedRef = useRef(onProductScanned)
  const [supabase] = useState(() => createBrowserClient())
  const [session, setSession] = useState<ScannerSession | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [scannerUrl, setScannerUrl] = useState("")
  const [isLocalOrigin, setIsLocalOrigin] = useState(false)
  const [scannerUrlWarning, setScannerUrlWarning] = useState<string | null>(null)

  useEffect(() => {
    onProductScannedRef.current = onProductScanned
  }, [onProductScanned])

  useEffect(() => {
    onSessionChange?.(session)
  }, [onSessionChange, session])

  useEffect(() => {
    if (!session) {
      setScannerUrl("")
      setIsLocalOrigin(false)
      setScannerUrlWarning(null)
      return
    }

    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const isLocalHost = LOCAL_HOSTNAMES.has(window.location.hostname)

    try {
      if (configuredAppUrl) {
        setScannerUrl(buildScannerUrl(configuredAppUrl, session.pairingCode))
        setIsLocalOrigin(false)
        setScannerUrlWarning(null)
        return
      }

      if (isLocalHost) {
        setScannerUrl(buildScannerUrl(window.location.origin, session.pairingCode))
        setIsLocalOrigin(true)
        setScannerUrlWarning(null)
        return
      }
    } catch {
      setScannerUrl("")
      setIsLocalOrigin(false)
      setScannerUrlWarning(
        "NEXT_PUBLIC_APP_URL está inválida. Configure a URL principal completa do app."
      )
      return
    }

    setScannerUrl("")
    setIsLocalOrigin(false)
    setScannerUrlWarning(
      "Configure NEXT_PUBLIC_APP_URL com a URL principal para gerar o QR Code do scanner fora do ambiente local."
    )
  }, [session])

  useEffect(() => {
    if (!session) {
      return
    }

    const channel = supabase
      .channel(getScannerChannelName(session.id))
      .on("broadcast", { event: "scanner-paired" }, ({ payload }) => {
        const pairingPayload = payload as ScannerPairedPayload

        if (pairingPayload.sessionId !== session.id) {
          return
        }

        setSession((current) =>
          current
            ? {
                ...current,
                status: "CONNECTED",
              }
            : current
        )

        toast.success(`Scanner conectado com o código ${pairingPayload.pairingCode}.`)
      })
      .on("broadcast", { event: "product-scanned" }, ({ payload }) => {
        const scanPayload = payload as ScannerBroadcastPayload

        if (scanPayload.sessionId !== session.id || !scanPayload.product) {
          return
        }

        setSession((current) =>
          current
            ? {
                ...current,
                status: "CONNECTED",
              }
            : current
        )

        const added = onProductScannedRef.current(scanPayload.product)

        if (added) {
          toast.success("📦 Produto adicionado via scanner:", {
            description: `${scanPayload.product.name} • ${formatCentsToBRL(scanPayload.product.salePriceCents)}`,
            duration: 3_000,
          })
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          toast.error("Não foi possível conectar o canal do scanner.")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session, supabase])

  async function handleCreateSession() {
    try {
      setIsCreatingSession(true)
      const response = await fetch("/api/scanner/sessions", {
        method: "POST",
      })
      const responseData = (await response.json()) as ScannerSessionApiResponse

      if (!response.ok || !responseData.data) {
        throw createApiError(
          response.status,
          responseData.error ?? "Não foi possível criar a sessão do scanner."
        )
      }

      setSession(responseData.data)
      toast.success("Código de pareamento gerado para o scanner mobile.")
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/70 p-4 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton
          type="button"
          size="sm"
          variant={session ? "outline" : "default"}
          isLoading={isCreatingSession}
          loadingLabel="Gerando..."
          onClick={handleCreateSession}
        >
          {session ? "Gerar novo código" : "📱 Usar celular como leitor"}
        </LoadingButton>

        {session ? (
          <Badge
            variant="outline"
            className={getScannerStatusClasses(session.status)}
          >
            {session.status === "CONNECTED" ? <CheckCircle2 /> : <QrCode />}
            {getScannerStatusLabel(session.status)}
          </Badge>
        ) : null}
      </div>

      {session ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
          <div className="space-y-3">
            <div className="rounded-[24px] bg-[#111827] px-4 py-5 text-center text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Código de pareamento
              </p>
              <strong className="mt-3 block text-3xl font-semibold tracking-[0.35em] sm:text-4xl">
                {session.pairingCode}
              </strong>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Abra essa URL no celular ou escaneie o QR Code.</p>
              {scannerUrl ? (
                <p className="break-all rounded-2xl border border-border/70 bg-muted/40 px-3 py-2 text-xs">
                  {scannerUrl}
                </p>
              ) : null}
              {isLocalOrigin ? (
                <p className="text-amber-600">
                  Em ambiente local, use um IP ou domínio acessível no celular.
                  URLs com <code>localhost</code> não funcionam fora da máquina.
                </p>
              ) : null}
              {scannerUrlWarning ? (
                <p className="text-amber-600">{scannerUrlWarning}</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-border/70 bg-card p-4">
            {scannerUrl ? (
              <QRCodeSVG
                value={scannerUrl}
                size={148}
                bgColor="#ffffff"
                fgColor="#111827"
                level="M"
                includeMargin
              />
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                {scannerUrlWarning ?? "Gerando QR Code..."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
