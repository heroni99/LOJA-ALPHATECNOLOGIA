import "server-only"

import { createClient } from "@/lib/supabase/server"
import { buildStorageObjectPath } from "@/lib/storage"

type ResolveStorageUploadOptions = {
  formData: FormData
  entityId: string
  bucket: string
  allowedTypes: readonly string[]
  maxSizeBytes: number
}

type ResolvedStorageUpload = {
  path: string
  publicUrl: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

function getStorageErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function validateFileMetadata(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  allowedTypes: readonly string[],
  maxSizeBytes: number
) {
  if (!fileName) {
    throw new Error("Arquivo inválido.")
  }

  if (!allowedTypes.includes(mimeType)) {
    throw new Error("Tipo de arquivo não suportado.")
  }

  if (sizeBytes <= 0) {
    throw new Error("Arquivo vazio.")
  }

  if (sizeBytes > maxSizeBytes) {
    throw new Error("Arquivo acima do limite permitido.")
  }
}

function splitStoragePath(path: string) {
  const normalized = path.replace(/^\/+|\/+$/g, "")
  const lastSlashIndex = normalized.lastIndexOf("/")

  if (lastSlashIndex === -1) {
    return {
      directory: "",
      fileName: normalized,
    }
  }

  return {
    directory: normalized.slice(0, lastSlashIndex),
    fileName: normalized.slice(lastSlashIndex + 1),
  }
}

async function getStoredObjectMetadata(bucket: string, path: string) {
  const supabase = await createClient({ serviceRole: true })
  const { directory, fileName } = splitStoragePath(path)
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(directory, { limit: 100, search: fileName })

  if (error) {
    throw new Error(
      getStorageErrorMessage(error, "Não foi possível localizar o arquivo no Storage.")
    )
  }

  const file = (data ?? []).find((item) => item.name === fileName)

  if (!file) {
    throw new Error("Arquivo não encontrado no Storage.")
  }

  const metadata = (file.metadata ?? {}) as {
    mimetype?: string
    size?: number
  }

  return {
    fileName,
    mimeType: metadata.mimetype ?? "",
    sizeBytes: Number(metadata.size ?? 0),
  }
}

export async function resolveStorageUpload({
  formData,
  entityId,
  bucket,
  allowedTypes,
  maxSizeBytes,
}: ResolveStorageUploadOptions): Promise<ResolvedStorageUpload> {
  const rawPath = getFormDataString(formData, "path")
  const submitted = formData.get("file")
  const validatedPath = rawPath.startsWith(`${entityId}/`) ? rawPath : ""
  const supabase = await createClient({ serviceRole: true })

  if (submitted instanceof File && submitted.size > 0) {
    validateFileMetadata(
      submitted.name,
      submitted.type,
      submitted.size,
      allowedTypes,
      maxSizeBytes
    )

    const path = validatedPath || buildStorageObjectPath(entityId, submitted.name)
    const buffer = Buffer.from(await submitted.arrayBuffer())
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: submitted.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw new Error(
        getStorageErrorMessage(error, "Não foi possível enviar o arquivo.")
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    return {
      path,
      publicUrl,
      fileName: submitted.name,
      mimeType: submitted.type,
      sizeBytes: submitted.size,
    }
  }

  if (!validatedPath) {
    throw new Error("Nenhum arquivo foi enviado.")
  }

  const storedObject = await getStoredObjectMetadata(bucket, validatedPath)

  validateFileMetadata(
    storedObject.fileName,
    storedObject.mimeType,
    storedObject.sizeBytes,
    allowedTypes,
    maxSizeBytes
  )

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(validatedPath)

  return {
    path: validatedPath,
    publicUrl,
    fileName: storedObject.fileName,
    mimeType: storedObject.mimeType,
    sizeBytes: storedObject.sizeBytes,
  }
}

export async function removeStorageObject(bucket: string, path: string) {
  if (!path) {
    return
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(
      getStorageErrorMessage(error, "Não foi possível remover o arquivo do Storage.")
    )
  }
}
