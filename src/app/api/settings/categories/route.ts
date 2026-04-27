import { NextRequest, NextResponse } from "next/server"

import {
  getSettingsErrorMessage,
  getSettingsErrorStatus,
  toStoreCategoryCreateInput,
} from "@/lib/settings"
import {
  createStoreCategory,
  getSettingsContext,
  listStoreCategories,
} from "@/lib/settings-server"

export async function GET() {
  try {
    const context = await getSettingsContext()

    if (!context) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    if (!context.profileActive) {
      return NextResponse.json({ error: "Perfil do usuário está inativo." }, { status: 403 })
    }

    const categories = await listStoreCategories(context)

    return NextResponse.json({ data: categories })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getSettingsContext()

    if (!context) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    if (!context.profileActive) {
      return NextResponse.json({ error: "Perfil do usuário está inativo." }, { status: 403 })
    }

    const body = await request.json()
    const payload = toStoreCategoryCreateInput(body)
    const category = await createStoreCategory(context, payload)

    if (!category) {
      throw new Error("Não foi possível carregar a categoria criada.")
    }

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
