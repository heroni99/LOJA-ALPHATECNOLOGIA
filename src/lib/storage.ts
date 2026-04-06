export const PRODUCT_IMAGES_BUCKET = "product-images"
export const SERVICE_ORDER_ATTACHMENTS_BUCKET = "service-order-attachments"

export const PRODUCT_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const SERVICE_ORDER_ATTACHMENT_ACCEPTED_TYPES = [
  ...PRODUCT_IMAGE_ACCEPTED_TYPES,
  "application/pdf",
] as const

export const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const SERVICE_ORDER_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024

export function sanitizeStorageFilename(fileName: string) {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()

  return normalized || "arquivo"
}

export function buildStorageObjectPath(entityId: string, fileName: string) {
  const sanitized = sanitizeStorageFilename(fileName)
  const suffix = crypto.randomUUID().slice(0, 8)

  return `${entityId}/${Date.now()}-${suffix}-${sanitized}`
}

export function isImageMimeType(contentType: string | null | undefined) {
  return (contentType ?? "").startsWith("image/")
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function extractStoragePathFromPublicUrl(
  publicUrl: string | null | undefined,
  bucket: string
) {
  if (!publicUrl) {
    return null
  }

  try {
    const url = new URL(publicUrl)
    const marker = `/object/public/${bucket}/`
    const markerIndex = url.pathname.indexOf(marker)

    if (markerIndex === -1) {
      return null
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}
