import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  createProductAttachment,
  getCurrentStoreContext,
  getProductById,
  listProductAttachments,
} from "@/lib/products-server"
import { productAttachmentTypeSchema } from "@/lib/products"
import {
  PRODUCT_ATTACHMENTS_BUCKET,
  PRODUCT_ATTACHMENT_ACCEPTED_TYPES,
  PRODUCT_ATTACHMENT_MAX_SIZE_BYTES,
  PRODUCT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  buildStorageObjectPath,
  formatFileSize,
} from "@/lib/storage"
import { createSignedStorageUrl, removeStorageObject } from "@/lib/storage-server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar o anexo."
}

function validateAttachmentFile(file: File) {
  if (!PRODUCT_ATTACHMENT_ACCEPTED_TYPES.includes(file.type as (typeof PRODUCT_ATTACHMENT_ACCEPTED_TYPES)[number])) {
    throw new Error("Tipo de arquivo não suportado.")
  }

  if (file.size <= 0) {
    throw new Error("Arquivo vazio.")
  }

  if (file.size > PRODUCT_ATTACHMENT_MAX_SIZE_BYTES) {
    throw new Error(
      `O arquivo deve ter no máximo ${formatFileSize(PRODUCT_ATTACHMENT_MAX_SIZE_BYTES)}.`
    )
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const attachments = await listProductAttachments(params.id, storeContext.storeId)

    if (!attachments) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const signedAttachments = await Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        fileUrl: await createSignedStorageUrl(
          PRODUCT_ATTACHMENTS_BUCKET,
          attachment.fileUrl,
          PRODUCT_ATTACHMENT_SIGNED_URL_TTL_SECONDS
        ),
      }))
    )

    return NextResponse.json({ data: signedAttachments })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let uploadedPath = ""

  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const product = await getProductById(params.id, storeContext.storeId)

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo foi enviado." },
        { status: 400 }
      )
    }

    validateAttachmentFile(file)

    const descriptionValue = formData.get("description")
    const attachmentTypeValue = formData.get("attachment_type")
    const attachmentType = productAttachmentTypeSchema.parse(
      typeof attachmentTypeValue === "string" && attachmentTypeValue.trim()
        ? attachmentTypeValue.trim()
        : "INVOICE"
    )

    uploadedPath = buildStorageObjectPath(params.id, file.name)

    const supabase = await createClient({ serviceRole: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_ATTACHMENTS_BUCKET)
      .upload(uploadedPath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const attachment = await createProductAttachment(
      params.id,
      storeContext.storeId,
      storeContext.userId,
      {
        fileName: file.name,
        fileUrl: uploadedPath,
        fileType: file.type,
        fileSizeKb: Math.max(1, Math.ceil(file.size / 1024)),
        description:
          typeof descriptionValue === "string" ? descriptionValue : null,
        attachmentType,
      }
    )

    if (!attachment) {
      await removeStorageObject(PRODUCT_ATTACHMENTS_BUCKET, uploadedPath).catch(() => null)

      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    return NextResponse.json(
      {
        data: {
          ...attachment,
          fileUrl: await createSignedStorageUrl(
            PRODUCT_ATTACHMENTS_BUCKET,
            attachment.fileUrl,
            PRODUCT_ATTACHMENT_SIGNED_URL_TTL_SECONDS
          ),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (uploadedPath) {
      await removeStorageObject(PRODUCT_ATTACHMENTS_BUCKET, uploadedPath).catch(() => null)
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 })
  }
}
