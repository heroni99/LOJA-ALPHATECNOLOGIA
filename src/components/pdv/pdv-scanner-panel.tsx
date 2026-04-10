"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"

import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
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
}

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

export function PdvScannerPanel({ onProductScanned }: PdvScannerPanelProps) {
  const router = useRouter()
  const onProductScannedRef = useRef(onProductScanned)
  const [supabase] = useState(() => createBrowserClient())
  const [session, setSession] = useState<ScannerSession | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [scannerUrl, setScannerUrl] = useState("")
  const [isLocalOrigin, setIsLocalOrigin] = useState(false)

  useEffect(() => {
    onProductScannedRef.current = onProductScanned
  }, [onProductScanned])

  useEffect(() => {
    if (!session) {
      setScannerUrl("")
      setIsLocalOrigin(false)
      return
    }

    const url = new URL("/scanner", window.location.origin)
    url.searchParams.set("code", session.pairingCode)

    setScannerUrl(url.toString())
    setIsLocalOrigin(
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
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
          toast.success(`${scanPayload.product.name} adicionado via scanner.`)
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
    <SectionCard
      title="Scanner mobile"
      description="Pareie um celular via Supabase Realtime para ler códigos de barras e enviar produtos direto para o carrinho."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="h-11 px-5"
              disabled={isCreatingSession}
              onClick={handleCreateSession}
            >
              {isCreatingSession ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Smartphone />
              )}
              {session ? "Gerar novo código" : "Usar celular como scanner"}
            </Button>

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
            <>
              <div className="rounded-[28px] bg-[#111827] px-5 py-6 text-center text-white">
                <p className="text-sm uppercase tracking-[0.18em] text-white/60">
                  Código de pareamento
                </p>
                <strong className="mt-3 block text-4xl font-semibold tracking-[0.35em] sm:text-5xl">
                  {session.pairingCode}
                </strong>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Abra a página do scanner no celular e informe o código acima.
                </p>
                <p>
                  Depois do pareamento, cada leitura será enviada em tempo real
                  para este PDV.
                </p>
                {scannerUrl ? (
                  <p className="break-all rounded-2xl border border-border/70 bg-muted/40 px-3 py-2 text-xs">
                    {scannerUrl}
                  </p>
                ) : null}
                {isLocalOrigin ? (
                  <p className="text-amber-600">
                    Em ambiente local, use o IP ou um domínio acessível no celular.
                    URLs com <code>localhost</code> não funcionam fora da máquina.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border/70 bg-muted/30 px-5 py-6 text-sm text-muted-foreground">
              Gere um código para conectar o celular e começar a escanear.
            </div>
          )}
        </div>

        <div className="flex items-center justify-center rounded-[28px] border border-border/70 bg-background p-5">
          {session && scannerUrl ? (
            <div className="space-y-3 text-center">
              <div className="inline-flex rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5">
                <QRCodeSVG
                  value={scannerUrl}
                  size={176}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-xs text-muted-foreground">
                QR code para abrir o scanner no celular
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-center text-muted-foreground">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                <QrCode className="size-7" />
              </div>
              <p className="text-sm">
                O QR code aparece aqui assim que a sessão for criada.
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
