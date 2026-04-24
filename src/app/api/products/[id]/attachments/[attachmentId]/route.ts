import { NextRequest, NextResponse } from "next/server"

import {
  deleteProductAttachment,
  getProductAttachmentById,
  getProductById,
  getCurrentStoreContext,
} from "@/lib/products-server"
import { PRODUCT_ATTACHMENTS_BUCKET } from "@/lib/storage"
import { removeStorageObject } from "@/lib/storage-server"

type RouteContext = {
  params: {
    id: string
    attachmentId: string
  }
}

function isMissingStorageObjectError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return /not found|no such file|object/i.test(error.message)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const product = await getProductById(params.id, storeContext.storeId)

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const attachment = await getProductAttachmentById(
      params.id,
      params.attachmentId,
      storeContext.storeId
    )

    if (!attachment) {
      return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 })
    }

    try {
      await removeStorageObject(PRODUCT_ATTACHMENTS_BUCKET, attachment.fileUrl)
    } catch (error) {
      if (!isMissingStorageObjectError(error)) {
        throw error
      }
    }

    await deleteProductAttachment(params.id, params.attachmentId, storeContext.storeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o anexo.",
      },
      { status: 400 }
    )
  }
}
