"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Trash2,
  UploadCloud,
} from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  getProductAttachmentTypeLabel,
  productAttachmentTypeSchema,
  type ProductAttachment,
  type ProductAttachmentType,
} from "@/lib/products"
import { formatDateTime } from "@/lib/products"
import {
  formatFileSize,
  isImageMimeType,
  PRODUCT_ATTACHMENT_ACCEPTED_TYPES,
  PRODUCT_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/storage"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type AttachmentApiResponse = {
  data?: ProductAttachment | ProductAttachment[]
  error?: string
}

type ProductAttachmentsPanelProps = {
  productId: string
  initialAttachments: ProductAttachment[]
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

export function ProductAttachmentsPanel({
  productId,
  initialAttachments,
}: ProductAttachmentsPanelProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState(initialAttachments)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [attachmentType, setAttachmentType] =
    useState<ProductAttachmentType>("INVOICE")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<ProductAttachment | null>(
    null
  )
  const helperText = useMemo(() => {
    return `${formatAcceptedTypes(PRODUCT_ATTACHMENT_ACCEPTED_TYPES)} até ${formatFileSize(PRODUCT_ATTACHMENT_MAX_SIZE_BYTES)}`
  }, [])

  useEffect(() => {
    if (!selectedFile || !isImageMimeType(selectedFile.type)) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  function openPicker() {
    inputRef.current?.click()
  }

  function validateFile(file: File) {
    if (!PRODUCT_ATTACHMENT_ACCEPTED_TYPES.includes(file.type as (typeof PRODUCT_ATTACHMENT_ACCEPTED_TYPES)[number])) {
      toast.error(
        `Formato inválido. Envie ${formatAcceptedTypes(PRODUCT_ATTACHMENT_ACCEPTED_TYPES)}.`
      )
      return false
    }

    if (file.size > PRODUCT_ATTACHMENT_MAX_SIZE_BYTES) {
      toast.error(
        `O arquivo deve ter no máximo ${formatFileSize(PRODUCT_ATTACHMENT_MAX_SIZE_BYTES)}.`
      )
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
  }

  function resetUploadState() {
    setSelectedFile(null)
    setDescription("")
    setAttachmentType("INVOICE")
  }

  async function handleUpload() {
    if (!selectedFile) {
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.set("file", selectedFile)
      formData.set("description", description)
      formData.set("attachment_type", attachmentType)

      const response = await fetch(`/api/products/${productId}/attachments`, {
        method: "POST",
        body: formData,
      })
      const responseData = (await response.json()) as AttachmentApiResponse

      if (!response.ok || !responseData.data || Array.isArray(responseData.data)) {
        throw {
          status: response.status,
          error: responseData.error ?? "Não foi possível enviar o anexo.",
        }
      }

      setAttachments((current) => [responseData.data as ProductAttachment, ...current])
      resetUploadState()
      toast.success("Anexo enviado com sucesso.")
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      const response = await fetch(
        `/api/products/${productId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      )
      const responseData = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok) {
        throw {
          status: response.status,
          error: responseData.error ?? "Não foi possível remover o anexo.",
        }
      }

      setAttachments((current) =>
        current.filter((attachment) => attachment.id !== attachmentId)
      )
      toast.success("Anexo removido com sucesso.")
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    }
  }

  return (
    <div className="grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_ATTACHMENT_ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          handleFileSelection(event.target.files?.[0] ?? null)
          event.target.value = ""
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openPicker()
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
          "grid gap-4 rounded-3xl border border-dashed border-border/80 bg-muted/15 p-5 transition-colors",
          isDragging && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-80"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-background p-3 text-primary shadow-sm shadow-black/5">
            <UploadCloud className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Arraste ou clique para anexar nota de compra
            </p>
            <p className="text-sm text-muted-foreground">
              Aceita PDF, JPG, PNG e WEBP para consulta interna do produto.
            </p>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <Input
            value={description}
            placeholder="Descrição opcional (ex: NF Compra Jan/2025)"
            onChange={(event) => setDescription(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
          <Select
            value={attachmentType}
            onValueChange={(value) =>
              setAttachmentType(productAttachmentTypeSchema.parse(value))
            }
          >
            <SelectTrigger onClick={(event) => event.stopPropagation()}>
              <SelectValue placeholder="Tipo do anexo" />
            </SelectTrigger>
            <SelectContent>
              {productAttachmentTypeSchema.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {getProductAttachmentTypeLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFile ? (
          <div
            className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-4"
            onClick={(event) => event.stopPropagation()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização do anexo selecionado"
                className="h-56 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 text-center">
                <FileText className="size-10 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Pré-visualização indisponível para este formato.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)} •{" "}
                  {getProductAttachmentTypeLabel(attachmentType)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetUploadState()}
                  disabled={isUploading}
                >
                  Limpar
                </Button>
                <LoadingButton
                  type="button"
                  isLoading={isUploading}
                  onClick={() => void handleUpload()}
                >
                  Enviar arquivo
                </LoadingButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum anexo enviado."
          description="As notas de compra, garantias, manuais e outros documentos aparecerão aqui."
          className="min-h-56"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment) => {
            const imageFile = isImageMimeType(attachment.fileType)

            return (
              <div
                key={attachment.id}
                className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4"
              >
                {imageFile ? (
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="h-44 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 text-center transition-colors hover:bg-muted/60"
                  >
                    <FileText className="size-10 text-primary" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{attachment.fileName}</p>
                      <p className="text-sm text-muted-foreground">Documento PDF</p>
                    </div>
                  </a>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {attachment.fileName}
                    </p>
                    <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {getProductAttachmentTypeLabel(attachment.attachmentType)}
                    </span>
                  </div>
                  {attachment.description ? (
                    <p className="text-sm text-muted-foreground">
                      {attachment.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {attachment.fileSizeKb
                      ? formatFileSize(attachment.fileSizeKb * 1024)
                      : "Tamanho não informado"}{" "}
                    • {formatDateTime(attachment.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {imageFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewAttachment(attachment)}
                    >
                      <Eye />
                      Visualizar
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                        Abrir
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={attachment.fileName}
                    >
                      <Download />
                      Download
                    </a>
                  </Button>
                  <ConfirmDialog
                    title="Remover anexo"
                    description="Este documento será removido do produto e do Storage."
                    confirmLabel="Remover"
                    variant="danger"
                    onConfirm={() => handleDelete(attachment.id)}
                    trigger={
                      <Button type="button" variant="outline">
                        <Trash2 />
                        Excluir
                      </Button>
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.fileName ?? "Visualizar anexo"}</DialogTitle>
            <DialogDescription>
              Visualização da imagem anexada ao produto.
            </DialogDescription>
          </DialogHeader>
          {previewAttachment ? (
            <img
              src={previewAttachment.fileUrl}
              alt={previewAttachment.fileName}
              className="max-h-[70vh] w-full rounded-2xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
