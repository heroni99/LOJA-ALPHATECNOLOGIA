import { NextRequest, NextResponse } from "next/server"

import {
  getCurrentStoreContext,
  updateProductImageUrl,
} from "@/lib/products-server"
import { createClient } from "@/lib/supabase/server"
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

type RouteContext = {
  params: {
    id: string
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar o upload da imagem."
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let uploadedPath = ""

  try {
    const storeContext = await getCurrentStoreContext()

    if (!storeContext) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const supabase = await createClient({ serviceRole: true })
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, image_url")
      .eq("store_id", storeContext.storeId)
      .eq("id", params.id)
      .maybeSingle()

    if (productError) {
      throw productError
    }

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const formData = await request.formData()
    const upload = await resolveStorageUpload({
      formData,
      entityId: params.id,
      bucket: PRODUCT_IMAGES_BUCKET,
      allowedTypes: PRODUCT_IMAGE_ACCEPTED_TYPES,
      maxSizeBytes: PRODUCT_IMAGE_MAX_SIZE_BYTES,
    })
    uploadedPath = upload.path

    const updatedProduct = await updateProductImageUrl(
      params.id,
      storeContext.storeId,
      upload.publicUrl
    )

    if (!updatedProduct) {
      await removeStorageObject(PRODUCT_IMAGES_BUCKET, upload.path)

      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const previousPath = extractStoragePathFromPublicUrl(
      product.image_url,
      PRODUCT_IMAGES_BUCKET
    )

    if (previousPath && previousPath !== upload.path) {
      await removeStorageObject(PRODUCT_IMAGES_BUCKET, previousPath).catch(() => null)
    }

    return NextResponse.json({ url: upload.publicUrl })
  } catch (error) {
    if (uploadedPath) {
      await removeStorageObject(PRODUCT_IMAGES_BUCKET, uploadedPath).catch(() => null)
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 })
  }
}
