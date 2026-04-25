"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, FileText, ImagePlus, Loader2, UploadCloud, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { parseApiError } from "@/lib/api-error"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  buildStorageObjectPath,
  formatFileSize,
  isImageMimeType,
  PRODUCT_IMAGE_ACCEPTED_TYPES,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
  PRODUCT_IMAGES_BUCKET,
} from "@/lib/storage"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type ImageUploadResult = {
  url: string
  fileName: string
  mimeType: string
  sizeBytes: number
  data?: unknown
}

type ImageUploadProps = {
  currentUrl?: string
  onUpload: (url: string) => void
  productId: string
  variant?: "default" | "compact"
  bucket?: string
  endpoint?: string
  acceptedTypes?: readonly string[]
  maxSizeBytes?: number
  description?: string
  onUploadComplete?: (result: ImageUploadResult) => void
}

function formatAcceptedTypes(acceptedTypes: readonly string[]) {
  return acceptedTypes
    .map((type) => {
      if (type === "image/jpeg") {
        return "JPG"
      }

      if (type === "image/png") {
        return "PNG"
      }

      if (type === "image/webp") {
        return "WEBP"
      }

      if (type === "application/pdf") {
        return "PDF"
      }

      return type
    })
    .join(", ")
}

export function ImageUpload({
  currentUrl,
  onUpload,
  productId,
  variant = "default",
  bucket = PRODUCT_IMAGES_BUCKET,
  endpoint,
  acceptedTypes = PRODUCT_IMAGE_ACCEPTED_TYPES,
  maxSizeBytes = PRODUCT_IMAGE_MAX_SIZE_BYTES,
  description,
  onUploadComplete,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [supabase] = useState(() => createBrowserClient())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const resolvedEndpoint = endpoint ?? `/api/products/${productId}/image`

  const helperText = useMemo(() => {
    return `${formatAcceptedTypes(acceptedTypes)} até ${formatFileSize(maxSizeBytes)}`
  }, [acceptedTypes, maxSizeBytes])

  useEffect(() => {
    if (!selectedFile || !isImageMimeType(selectedFile.type)) {
      setPreviewUrl(null)

      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  function openFilePicker() {
    inputRef.current?.click()
  }

  function validateFile(file: File) {
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Formato inválido. Envie ${formatAcceptedTypes(acceptedTypes)}.`)

      return false
    }

    if (file.size > maxSizeBytes) {
      toast.error(`O arquivo deve ter no máximo ${formatFileSize(maxSizeBytes)}.`)

      return false
    }

    return true
  }

  function handleFileSelection(file: File | null) {
    if (!file) {
      return
    }

    if (!validateFile(file)) {
      return
    }

    setSelectedFile(file)
    setProgress(0)
  }

  function clearSelection() {
    setSelectedFile(null)
    setProgress(0)
  }

  async function handleUpload() {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setProgress(8)

    const progressInterval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 90) {
          return current
        }

        return Math.min(current + 7, 90)
      })
    }, 180)

    try {
      const plannedPath = buildStorageObjectPath(productId, selectedFile.name)
      let response: Response
      let responseData: { url?: string; data?: unknown; error?: string } | null = null
      let uploadedViaBrowser = false

      try {
        const { error } = await supabase.storage.from(bucket).upload(plannedPath, selectedFile, {
          contentType: selectedFile.type,
          cacheControl: "3600",
          upsert: false,
        })

        if (error) {
          throw error
        }

        uploadedViaBrowser = true

        const persistFormData = new FormData()
        persistFormData.set("path", plannedPath)

        response = await fetch(resolvedEndpoint, {
          method: "POST",
          body: persistFormData,
        })
        responseData = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(responseData?.error ?? "Não foi possível concluir o upload.")
        }
      } catch (error) {
        if (uploadedViaBrowser) {
          throw error
        }

        const fallbackFormData = new FormData()
        fallbackFormData.set("file", selectedFile)

        response = await fetch(resolvedEndpoint, {
          method: "POST",
          body: fallbackFormData,
        })
        responseData = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(responseData?.error ?? "Não foi possível concluir o upload.")
        }
      }

      const url = responseData?.url

      if (!url) {
        throw new Error("A API não retornou a URL do arquivo.")
      }

      setProgress(100)
      onUpload(url)
      onUploadComplete?.({
        url,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        data: responseData?.data,
      })
      clearSelection()
      toast.success("Arquivo enviado com sucesso.")
    } catch (error) {
      toast.error(parseApiError(error))
    } finally {
      window.clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  if (variant === "compact") {
    return (
      <div className="grid w-full max-w-[200px] gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          className="hidden"
          onChange={(event) => {
            handleFileSelection(event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              openFilePicker()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            handleFileSelection(event.dataTransfer.files?.[0] ?? null)
          }}
          className={cn(
            "group relative aspect-square w-full max-w-[200px] overflow-hidden rounded-3xl border border-dashed border-border/80 bg-muted/20 transition-colors",
            isDragging && "border-primary bg-primary/5",
            isUploading && "pointer-events-none opacity-80"
          )}
        >
          {previewUrl || currentUrl ? (
            <img
              src={previewUrl ?? currentUrl ?? ""}
              alt={selectedFile ? "Pré-visualização da imagem selecionada" : "Imagem atual"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="rounded-full bg-background p-2 text-primary shadow-sm shadow-black/5">
                <Camera className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Adicionar foto</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {helperText}
                </p>
              </div>
            </div>
          )}

          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        {selectedFile ? (
          <>
            <p className="truncate text-xs text-muted-foreground">{selectedFile.name}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation()
                  openFilePicker()
                }}
                disabled={isUploading}
              >
                <ImagePlus />
                Trocar imagem
              </Button>
              <Button
                type="button"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleUpload()
                }}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                {isUploading ? "Enviando..." : "Enviar"}
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Remover imagem selecionada"
                onClick={(event) => {
                  event.stopPropagation()
                  clearSelection()
                }}
                disabled={isUploading}
              >
                <X />
              </Button>
            </div>
          </>
        ) : currentUrl ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              openFilePicker()
            }}
            disabled={isUploading}
          >
            <ImagePlus />
            Trocar imagem
          </Button>
        ) : null}

        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}

        {isUploading ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}% concluído</p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={(event) => {
          handleFileSelection(event.target.files?.[0] ?? null)
          event.target.value = ""
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openFilePicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFileSelection(event.dataTransfer.files?.[0] ?? null)
        }}
        className={cn(
          "group grid gap-4 rounded-3xl border border-dashed border-border/80 bg-muted/20 p-5 text-left transition-colors",
          isDragging && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-80"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-background p-3 text-primary shadow-sm shadow-black/5">
              <UploadCloud className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Arraste um arquivo aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                {description ?? "O arquivo será salvo no Supabase Storage e vinculado ao cadastro."}
              </p>
              <p className="text-xs text-muted-foreground">{helperText}</p>
            </div>
          </div>
          <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {isUploading ? "Enviando" : "Selecionar"}
          </span>
        </div>

        {selectedFile ? (
          <div className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização do arquivo selecionado"
                className="h-56 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 text-center">
                <FileText className="size-10 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Pré-visualização não disponível para este formato.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation()
                    clearSelection()
                  }}
                  disabled={isUploading}
                >
                  <X />
                  Remover
                </Button>
                <Button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleUpload()
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {isUploading ? "Enviando..." : "Enviar arquivo"}
                </Button>
              </div>
            </div>
          </div>
        ) : currentUrl ? (
          <div className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4">
            <img
              src={currentUrl}
              alt="Arquivo atual"
              className="h-56 w-full rounded-2xl object-cover"
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Arquivo atual</p>
                <p className="text-xs text-muted-foreground">
                  Selecione outro arquivo para substituir.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation()
                  openFilePicker()
                }}
                disabled={isUploading}
              >
                <ImagePlus />
                Trocar arquivo
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {isUploading ? (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}% concluído</p>
        </div>
      ) : null}
    </div>
  )
}
