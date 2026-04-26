"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanLine,
  Smartphone,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { parseApiError } from "@/lib/api-error"
import { formatCentsToBRL } from "@/lib/products"
import {
  normalizePairingCode,
  type ScannerScanInput,
  type ScannerSession,
} from "@/lib/scanner"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type ScannerPageProps = {
  initialCode?: string
}

type ScannerPairApiResponse = {
  data?: ScannerSession
  error?: string
}

type ScannerScanProduct = {
  name: string
  internalCode: string
  salePriceCents: number
  imageUrl: string | null
}

type ScannerScanApiResponse = {
  success?: boolean
  barcode?: string
  product?: ScannerScanProduct
  message?: string
  error?: string
}

type StatusFeedback = {
  tone: "success" | "error" | "neutral"
  message: string
}

type ScanFeedback = {
  tone: "success" | "error"
  barcode: string
  title: string
  message?: string
  product?: ScannerScanProduct
}

const SCANNER_REGION_ID = "alpha-mobile-scanner-region"
const CAMERA_UNSUPPORTED_MESSAGE = "Câmera não suportada neste navegador"
const CAMERA_PERMISSION_DENIED_MESSAGE =
  "Permissão de câmera negada. Libere nas configurações."
const CAMERA_BLOCKED_MESSAGE =
  "Câmera bloqueada. Vá em Configurações > Privacidade > Câmera e permita o acesso para este site."
const ACTIVE_SCANNER_MESSAGE =
  "Scanner ativo. Alinhe o código de barras na linha laranja."
const SCAN_FEEDBACK_DURATION_MS = 2_000
const DUPLICATE_SCAN_WINDOW_MS = 3_000

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function getCameraStartErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    /notallowed|permission denied|denied|security|notreadable/i.test(
      error.message
    )
  ) {
    return CAMERA_BLOCKED_MESSAGE
  }

  if (
    error instanceof Error &&
    /notfound|device not found|devices not found|found no media|overconstrained/i.test(
      error.message
    )
  ) {
    return "Nenhuma câmera disponível neste dispositivo."
  }

  return CAMERA_BLOCKED_MESSAGE
}

function supportsVibration() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
}

function vibrate(pattern: number | number[]) {
  if (!supportsVibration()) {
    return
  }

  try {
    navigator.vibrate(pattern)
  } catch {}
}

export function ScannerPage({ initialCode }: ScannerPageProps) {
  const sessionRef = useRef<ScannerSession | null>(null)
  const handlePairRef = useRef<(codeOverride?: string) => Promise<void>>(
    async () => {}
  )
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ value: string; timestamp: number }>({
    value: "",
    timestamp: 0,
  })
  const isSubmittingScanRef = useRef(false)
  const autoPairAttemptedRef = useRef(false)
  const resumeTimeoutRef = useRef<number | null>(null)

  const [pairingCode, setPairingCode] = useState(
    normalizePairingCode(initialCode ?? "")
  )
  const [session, setSession] = useState<ScannerSession | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isStartingScanner, setIsStartingScanner] = useState(false)
  const [scannerRetryKey, setScannerRetryKey] = useState(0)
  const [feedback, setFeedback] = useState<StatusFeedback>({
    tone: "neutral",
    message: "Conecte o celular ao PDV para ativar a câmera.",
  })
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null)

  sessionRef.current = session

  useEffect(() => {
    setPairingCode(normalizePairingCode(initialCode ?? ""))
  }, [initialCode])

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
  }, [])

  const resumeScannerAfterFeedback = useCallback(() => {
    clearResumeTimeout()
    resumeTimeoutRef.current = window.setTimeout(() => {
      setScanFeedback(null)
      isSubmittingScanRef.current = false

      if (!sessionRef.current || !scannerRef.current) {
        return
      }

      try {
        scannerRef.current.resume()
        setFeedback({
          tone: "success",
          message: ACTIVE_SCANNER_MESSAGE,
        })
      } catch {}
    }, SCAN_FEEDBACK_DURATION_MS)
  }, [clearResumeTimeout])

  const destroyScanner = useCallback(async () => {
    clearResumeTimeout()
    isSubmittingScanRef.current = false

    const scanner = scannerRef.current
    scannerRef.current = null

    if (!scanner) {
      return
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch {}

    try {
      scanner.clear()
    } catch {}
  }, [clearResumeTimeout])

  useEffect(() => {
    if (!session) {
      clearResumeTimeout()
      setScanFeedback(null)
      void destroyScanner()
      return
    }

    let cancelled = false

    async function startScanner() {
      try {
        setIsStartingScanner(true)
        setFeedback({
          tone: "neutral",
          message: "Preparando a câmera do celular...",
        })
        setScanFeedback(null)

        await destroyScanner()

        if (!navigator.mediaDevices?.getUserMedia) {
          setFeedback({
            tone: "error",
            message: CAMERA_UNSUPPORTED_MESSAGE,
          })
          return
        }

        let permissionStream: MediaStream | null = null

        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          })
        } catch {
          setFeedback({
            tone: "error",
            message: CAMERA_PERMISSION_DENIED_MESSAGE,
          })
          toast.error(CAMERA_PERMISSION_DENIED_MESSAGE)
          return
        } finally {
          stopStream(permissionStream)
        }

        const {
          Html5Qrcode,
          Html5QrcodeSupportedFormats,
        } = await import("html5-qrcode")

        if (cancelled) {
          return
        }

        const scanner = new Html5Qrcode(SCANNER_REGION_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        })
        const config = {
          fps: 15,
          qrbox: {
            width: 280,
            height: 100,
          },
          aspectRatio: 1.5,
        }

        scannerRef.current = scanner

        const onScanSuccess = async (decodedText: string) => {
          const activeSession = sessionRef.current
          const barcode = decodedText.trim()

          if (!activeSession || !barcode) {
            return
          }

          const now = Date.now()

          if (
            isSubmittingScanRef.current ||
            (lastScanRef.current.value === barcode &&
              now - lastScanRef.current.timestamp < DUPLICATE_SCAN_WINDOW_MS)
          ) {
            return
          }

          lastScanRef.current = {
            value: barcode,
            timestamp: now,
          }
          isSubmittingScanRef.current = true
          clearResumeTimeout()

          try {
            scanner.pause()
          } catch {}

          try {
            const payload: ScannerScanInput = {
              barcode,
              pairing_code: activeSession.pairingCode,
            }
            const response = await fetch("/api/scanner/scan", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })
            const responseData = (await response.json().catch(() => null)) as
              | ScannerScanApiResponse
              | null

            if (!response.ok) {
              throw new Error(
                responseData?.error ??
                  responseData?.message ??
                  "Não foi possível enviar a leitura para o PDV."
              )
            }

            if (responseData?.success && responseData.product) {
              setScanFeedback({
                tone: "success",
                barcode,
                title: "Produto lido com sucesso!",
                product: responseData.product,
              })
              setFeedback({
                tone: "success",
                message: ACTIVE_SCANNER_MESSAGE,
              })
              vibrate([200])
              resumeScannerAfterFeedback()
              return
            }

            setScanFeedback({
              tone: "error",
              barcode,
              title: "Produto não encontrado",
              message: responseData?.message ?? "Confira o código e tente novamente.",
            })
            vibrate([100, 50, 100])
            resumeScannerAfterFeedback()
          } catch (error) {
            const message = parseApiError(error)
            const isSessionError = /sessão|expirada|pareado/i.test(message)

            setFeedback({
              tone: "error",
              message,
            })

            if (isSessionError) {
              setScanFeedback(null)
              isSubmittingScanRef.current = false
              setSession(null)
              return
            }

            setScanFeedback({
              tone: "error",
              barcode,
              title: "Falha ao processar leitura",
              message,
            })
            vibrate([100, 50, 100])
            resumeScannerAfterFeedback()
          }
        }
        const onScanError = () => {}

        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        )

        if (!cancelled) {
          setFeedback({
            tone: "success",
            message: ACTIVE_SCANNER_MESSAGE,
          })
        }
      } catch (error) {
        const message = getCameraStartErrorMessage(error)

        setFeedback({
          tone: "error",
          message,
        })
        toast.error(message)
      } finally {
        if (!cancelled) {
          setIsStartingScanner(false)
        }
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      void destroyScanner()
    }
  }, [
    clearResumeTimeout,
    destroyScanner,
    resumeScannerAfterFeedback,
    scannerRetryKey,
    session,
  ])

  async function handlePair(codeOverride?: string) {
    const normalized = normalizePairingCode(codeOverride ?? pairingCode)

    if (normalized.length !== 6) {
      setFeedback({
        tone: "error",
        message: "Informe um código de 6 caracteres para conectar o scanner.",
      })
      return
    }

    try {
      setIsConnecting(true)
      setFeedback({
        tone: "neutral",
        message: "Conectando o celular ao PDV...",
      })
      setScanFeedback(null)

      const response = await fetch("/api/scanner/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pairing_code: normalized,
        }),
      })
      const responseData = (await response.json()) as ScannerPairApiResponse

      if (!response.ok || !responseData.data) {
        throw new Error(responseData.error ?? "Não foi possível conectar o scanner.")
      }

      setPairingCode(responseData.data.pairingCode)
      setSession(responseData.data)
      setFeedback({
        tone: "success",
        message: "Celular conectado. Ativando a câmera...",
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: parseApiError(error),
      })
    } finally {
      setIsConnecting(false)
    }
  }

  handlePairRef.current = handlePair

  useEffect(() => {
    if (!initialCode || autoPairAttemptedRef.current || session) {
      return
    }

    const normalized = normalizePairingCode(initialCode)

    if (normalized.length !== 6) {
      return
    }

    autoPairAttemptedRef.current = true
    void handlePairRef.current(normalized)
  }, [initialCode, session])

  useEffect(() => {
    return () => {
      clearResumeTimeout()
    }
  }, [clearResumeTimeout])

  function handleDisconnect() {
    setSession(null)
    setScanFeedback(null)
    setFeedback({
      tone: "neutral",
      message: "Informe um novo código para conectar outro PDV.",
    })
  }

  function handleRetryCamera() {
    setScanFeedback(null)
    setFeedback({
      tone: "neutral",
      message: "Tentando acessar a câmera novamente...",
    })
    setScannerRetryKey((current) => current + 1)
  }

  const feedbackClasses =
    feedback.tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : feedback.tone === "error"
        ? "border-red-500/20 bg-red-500/10 text-red-700"
        : "border-border/70 bg-muted/40 text-muted-foreground"
  const scanFeedbackClasses =
    scanFeedback?.tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/95 text-white"
      : "border-red-500/30 bg-red-600/95 text-white"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fed7aa_0%,#fff7ed_35%,#ffffff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center gap-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#111827] text-white shadow-lg shadow-orange-500/10">
            <Smartphone className="size-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">
            Scanner mobile
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Conecte este celular ao PDV da ALPHA TECNOLOGIA e use a câmera como
            leitor de código de barras.
          </p>
        </div>

        <Card className="border border-border/70 bg-white/95 shadow-xl shadow-black/5 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl text-[#111827]">
                {session ? "Leitor ativo" : "Parear com o PDV"}
              </CardTitle>
              {session ? (
                <Badge variant="outline" className="border-primary/20 text-primary">
                  {session.pairingCode}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!session ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Código de pareamento
                  </label>
                  <Input
                    value={pairingCode}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoComplete="off"
                    inputMode="text"
                    maxLength={6}
                    placeholder="1234AB"
                    className="h-14 rounded-3xl text-center text-2xl font-semibold uppercase tracking-[0.4em]"
                    onChange={(event) =>
                      setPairingCode(normalizePairingCode(event.target.value))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void handlePair()
                      }
                    }}
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 w-full text-base"
                  disabled={isConnecting}
                  onClick={() => void handlePair()}
                >
                  {isConnecting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ScanLine />
                  )}
                  Conectar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm",
                    feedbackClasses
                  )}
                >
                  {feedback.tone === "success" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : feedback.tone === "error" ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <Camera className="mt-0.5 size-4 shrink-0" />
                  )}
                  <p>{feedback.message}</p>
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-black">
                  <div
                    id={SCANNER_REGION_ID}
                    className="min-h-[300px] w-full bg-black"
                  />
                  <div className="pointer-events-none absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]" />

                  {scanFeedback ? (
                    <div className="pointer-events-none absolute inset-x-4 bottom-4">
                      <div
                        className={cn(
                          "rounded-3xl border p-4 shadow-lg shadow-black/20 backdrop-blur",
                          scanFeedbackClasses
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {scanFeedback.tone === "success" ? (
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                          ) : (
                            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                          )}

                          {scanFeedback.product?.imageUrl ? (
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-white/20">
                              <Image
                                src={scanFeedback.product.imageUrl}
                                alt={scanFeedback.product.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                          ) : null}

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-semibold">{scanFeedback.title}</p>

                            {scanFeedback.tone === "success" && scanFeedback.product ? (
                              <>
                                <p className="truncate text-sm text-white/90">
                                  Nome: {scanFeedback.product.name}
                                </p>
                                <p className="text-sm text-white/90">
                                  Preço:{" "}
                                  {formatCentsToBRL(scanFeedback.product.salePriceCents)}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-white/90">
                                  Código: {scanFeedback.barcode}
                                </p>
                                {scanFeedback.message ? (
                                  <p className="text-xs text-white/80">
                                    {scanFeedback.message}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isStartingScanner}
                    onClick={handleDisconnect}
                  >
                    Trocar código
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={isStartingScanner}
                    onClick={handleRetryCamera}
                  >
                    {isStartingScanner ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Camera />
                    )}
                    {isStartingScanner ? "Abrindo câmera" : "Tentar novamente"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
