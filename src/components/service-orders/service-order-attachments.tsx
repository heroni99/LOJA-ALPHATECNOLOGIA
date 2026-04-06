"use client"

import { useState } from "react"
import { ExternalLink, FileImage, FileText } from "lucide-react"

import { ImageUpload } from "@/components/shared/image-upload"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/products"
import { type ServiceOrderAttachment } from "@/lib/service-orders"
import {
  formatFileSize,
  isImageMimeType,
  SERVICE_ORDER_ATTACHMENT_ACCEPTED_TYPES,
  SERVICE_ORDER_ATTACHMENT_MAX_SIZE_BYTES,
  SERVICE_ORDER_ATTACHMENTS_BUCKET,
} from "@/lib/storage"

type ServiceOrderAttachmentsProps = {
  serviceOrderId: string
  initialAttachments: ServiceOrderAttachment[]
}

export function ServiceOrderAttachments({
  serviceOrderId,
  initialAttachments,
}: ServiceOrderAttachmentsProps) {
  const [attachments, setAttachments] = useState(initialAttachments)

  return (
    <div className="grid gap-4">
      <ImageUpload
        productId={serviceOrderId}
        bucket={SERVICE_ORDER_ATTACHMENTS_BUCKET}
        endpoint={`/api/service-orders/${serviceOrderId}/attachments`}
        acceptedTypes={SERVICE_ORDER_ATTACHMENT_ACCEPTED_TYPES}
        maxSizeBytes={SERVICE_ORDER_ATTACHMENT_MAX_SIZE_BYTES}
        description="Envie fotos ou PDF da ordem de serviço para manter laudo, evidências e documentação do atendimento."
        onUpload={() => undefined}
        onUploadComplete={(result) => {
          const attachment = result.data as ServiceOrderAttachment | undefined

          setAttachments((current) => [
            attachment ?? {
              id: `${Date.now()}`,
              fileName: result.fileName,
              fileUrl: result.url,
              mimeType: result.mimeType,
              sizeBytes: result.sizeBytes,
              createdAt: new Date().toISOString(),
              createdByUserId: null,
              createdByName: null,
            },
            ...current,
          ])
        }}
      />

      {attachments.length === 0 ? (
        <EmptyState
          icon={FileImage}
          title="Nenhum anexo enviado."
          description="As fotos do aparelho, laudos e PDFs da OS aparecerão aqui."
          className="min-h-56"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4"
            >
              {isImageMimeType(attachment.mimeType) ? (
                <img
                  src={attachment.fileUrl}
                  alt={attachment.fileName}
                  className="h-44 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 text-center">
                  <FileText className="size-10 text-primary" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{attachment.fileName}</p>
                    <p className="text-sm text-muted-foreground">Documento PDF</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)} • {attachment.createdByName ?? "Equipe"} •{" "}
                  {formatDateTime(attachment.createdAt)}
                </p>
              </div>

              <Button variant="outline" asChild>
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Abrir anexo
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
