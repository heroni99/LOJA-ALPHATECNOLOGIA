import { NextRequest, NextResponse } from "next/server"

import {
  getSettingsErrorMessage,
  getSettingsErrorStatus,
  toStoreCategoryUpdateInput,
} from "@/lib/settings"
import {
  getSettingsContext,
  updateStoreCategory,
} from "@/lib/settings-server"

type RouteContext = {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getSettingsContext()

    if (!context) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    if (!context.profileActive) {
      return NextResponse.json({ error: "Perfil do usuário está inativo." }, { status: 403 })
    }

    const body = await request.json()
    const payload = toStoreCategoryUpdateInput(body)
    const category = await updateStoreCategory(context, params.id, payload)

    if (!category) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }

    return NextResponse.json({ data: category })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
