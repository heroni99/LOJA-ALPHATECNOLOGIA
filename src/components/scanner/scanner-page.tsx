"use client"

import { useEffect, useRef, useState } from "react"
import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanLine,
  Smartphone,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  normalizePairingCode,
  type ScannerScanInput,
  type ScannerSession,
} from "@/lib/scanner"
import { cn } from "@/lib/utils"

type ScannerPageProps = {
  initialCode?: string
}

type ScannerPairApiResponse = {
  data?: ScannerSession
  error?: string
}

type ScannerScanApiResponse = {
  data?: {
    message?: string
    product?: {
      name: string
      internalCode: string
    }
  }
  error?: string
}

type ScanFeedback = {
  tone: "success" | "error" | "neutral"
  message: string
}

const SCANNER_REGION_ID = "alpha-mobile-scanner-region"

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

  const [pairingCode, setPairingCode] = useState(
    normalizePairingCode(initialCode ?? "")
  )
  const [session, setSession] = useState<ScannerSession | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isStartingScanner, setIsStartingScanner] = useState(false)
  const [feedback, setFeedback] = useState<ScanFeedback>({
    tone: "neutral",
    message: "Conecte o celular ao PDV para ativar a câmera.",
  })

  sessionRef.current = session

  useEffect(() => {
    setPairingCode(normalizePairingCode(initialCode ?? ""))
  }, [initialCode])

  async function destroyScanner() {
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
  }

  useEffect(() => {
    if (!session) {
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

        await destroyScanner()

        const {
          Html5Qrcode,
          Html5QrcodeSupportedFormats,
        } = await import("html5-qrcode")

        if (cancelled) {
          return
        }

        const scanner = new Html5Qrcode(SCANNER_REGION_ID, {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        })
        const config = {
          fps: 12,
          qrbox: {
            width: 280,
            height: 120,
          },
          aspectRatio: 1.777778,
        }

        scannerRef.current = scanner

        const onDecode = async (decodedText: string) => {
          const activeSession = sessionRef.current
          const barcode = decodedText.trim()

          if (!activeSession || !barcode) {
            return
          }

          const now = Date.now()

          if (
            isSubmittingScanRef.current ||
            (lastScanRef.current.value === barcode &&
              now - lastScanRef.current.timestamp < 1200)
          ) {
            return
          }

          lastScanRef.current = {
            value: barcode,
            timestamp: now,
          }
          isSubmittingScanRef.current = true
          navigator.vibrate?.(100)

          try {
            const payload: ScannerScanInput = {
              barcode,
              session_id: activeSession.id,
            }
            const response = await fetch("/api/scanner/scan", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })
            const responseData = (await response.json()) as ScannerScanApiResponse

            if (!response.ok) {
              throw new Error(
                responseData.error ?? "Não foi possível enviar a leitura para o PDV."
              )
            }

            const productName =
              responseData.data?.product?.name ?? "Produto encontrado"
            const internalCode = responseData.data?.product?.internalCode

            setFeedback({
              tone: "success",
              message: internalCode
                ? `${productName} (${internalCode}) enviado ao PDV.`
                : `${productName} enviado ao PDV.`,
            })
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Não foi possível enviar a leitura para o PDV."

            setFeedback({
              tone: "error",
              message,
            })

            if (/sessão|expirada|pareado/i.test(message)) {
              setSession(null)
            }
          } finally {
            window.setTimeout(() => {
              isSubmittingScanRef.current = false
            }, 400)
          }
        }

        try {
          await scanner.start(
            {
              facingMode: {
                ideal: "environment",
              },
            },
            config,
            onDecode,
            () => {}
          )
        } catch {
          const cameras = await Html5Qrcode.getCameras()

          if (!cameras.length) {
            throw new Error("Nenhuma câmera disponível neste dispositivo.")
          }

          await scanner.start(cameras[0].id, config, onDecode, () => {})
        }

        if (!cancelled) {
          setFeedback({
            tone: "success",
            message: "Scanner ativo. Aponte a câmera para o código de barras.",
          })
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a câmera do scanner."

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
  }, [session])

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
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível conectar o scanner.",
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

  function handleDisconnect() {
    setSession(null)
    setFeedback({
      tone: "neutral",
      message: "Informe um novo código para conectar outro PDV.",
    })
  }

  const feedbackClasses =
    feedback.tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : feedback.tone === "error"
        ? "border-red-500/20 bg-red-500/10 text-red-700"
        : "border-border/70 bg-muted/40 text-muted-foreground"

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

                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-black">
                  <div
                    id={SCANNER_REGION_ID}
                    className="min-h-[300px] w-full bg-black"
                  />
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
                    onClick={() => {
                      setFeedback({
                        tone: "neutral",
                        message:
                          "Aponte a câmera para o código de barras do produto.",
                      })
                    }}
                  >
                    {isStartingScanner ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Camera />
                    )}
                    {isStartingScanner ? "Abrindo câmera" : "Scanner pronto"}
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
