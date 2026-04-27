import { NextRequest, NextResponse } from "next/server"

import { getSettingsErrorMessage, getSettingsErrorStatus } from "@/lib/settings"
import { getSettingsContext } from "@/lib/settings-server"
import {
  extractStoragePathFromPublicUrl,
  PRODUCT_IMAGE_ACCEPTED_TYPES,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
  PRODUCT_IMAGES_BUCKET,
} from "@/lib/storage"
import {
  removeStorageObject,
  resolveStorageUpload,
} from "@/lib/storage-server"

export async function POST(request: NextRequest) {
  let uploadedPath = ""

  try {
    const context = await getSettingsContext()

    if (!context) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    if (!context.profileActive) {
      return NextResponse.json({ error: "Perfil do usuário está inativo." }, { status: 403 })
    }

    const { data: store, error: storeError } = await context.supabase
      .from("stores")
      .select("id, logo_url")
      .eq("id", context.storeId)
      .maybeSingle()

    if (storeError) {
      throw storeError
    }

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
    }

    const formData = await request.formData()
    const upload = await resolveStorageUpload({
      formData,
      entityId: context.storeId,
      bucket: PRODUCT_IMAGES_BUCKET,
      allowedTypes: PRODUCT_IMAGE_ACCEPTED_TYPES,
      maxSizeBytes: PRODUCT_IMAGE_MAX_SIZE_BYTES,
    })
    uploadedPath = upload.path

    const { error: updateError } = await context.supabase
      .from("stores")
      .update({
        logo_url: upload.publicUrl,
      })
      .eq("id", context.storeId)

    if (updateError) {
      throw updateError
    }

    const previousPath = extractStoragePathFromPublicUrl(
      store.logo_url,
      PRODUCT_IMAGES_BUCKET
    )

    if (previousPath && previousPath !== upload.path) {
      await removeStorageObject(PRODUCT_IMAGES_BUCKET, previousPath).catch(() => null)
    }

    return NextResponse.json({
      url: upload.publicUrl,
      data: {
        logoUrl: upload.publicUrl,
      },
    })
  } catch (error) {
    if (uploadedPath) {
      await removeStorageObject(PRODUCT_IMAGES_BUCKET, uploadedPath).catch(() => null)
    }

    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
