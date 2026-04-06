import { NextRequest, NextResponse } from "next/server"

import { getCurrentStoreContext } from "@/lib/products-server"
import { createServiceOrderAttachment } from "@/lib/service-orders-server"
import { createClient } from "@/lib/supabase/server"
import {
  SERVICE_ORDER_ATTACHMENT_ACCEPTED_TYPES,
  SERVICE_ORDER_ATTACHMENT_MAX_SIZE_BYTES,
  SERVICE_ORDER_ATTACHMENTS_BUCKET,
} from "@/lib/storage"
import {
  removeStorageObject,
  resolveStorageUpload,
} from "@/lib/storage-server"

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar o anexo."
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let uploadedPath = ""

  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const supabase = await createClient({ serviceRole: true })
    const { data: serviceOrder, error: serviceOrderError } = await supabase
      .from("service_orders")
      .select("id")
      .eq("store_id", storeContext.storeId)
      .eq("id", params.id)
      .maybeSingle()

    if (serviceOrderError) {
      throw serviceOrderError
    }

    if (!serviceOrder) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada." },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const upload = await resolveStorageUpload({
      formData,
      entityId: params.id,
      bucket: SERVICE_ORDER_ATTACHMENTS_BUCKET,
      allowedTypes: SERVICE_ORDER_ATTACHMENT_ACCEPTED_TYPES,
      maxSizeBytes: SERVICE_ORDER_ATTACHMENT_MAX_SIZE_BYTES,
    })
    uploadedPath = upload.path

    const attachment = await createServiceOrderAttachment(
      params.id,
      storeContext.storeId,
      storeContext.userId,
      {
        fileName: upload.fileName,
        filePath: upload.path,
        fileUrl: upload.publicUrl,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes,
      }
    )

    if (!attachment) {
      await removeStorageObject(SERVICE_ORDER_ATTACHMENTS_BUCKET, upload.path)

      return NextResponse.json(
        { error: "Ordem de serviço não encontrada." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      url: upload.publicUrl,
      data: attachment,
    })
  } catch (error) {
    if (uploadedPath) {
      await removeStorageObject(SERVICE_ORDER_ATTACHMENTS_BUCKET, uploadedPath).catch(
        () => null
      )
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 })
  }
}
