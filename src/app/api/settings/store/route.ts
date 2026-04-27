import { NextRequest, NextResponse } from "next/server"

import {
  getSettingsErrorMessage,
  getSettingsErrorStatus,
  toStoreSettingsMutationInput,
} from "@/lib/settings"
import {
  getSettingsContext,
  getStoreSettings,
  updateStoreSettings,
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

    const store = await getStoreSettings(context)

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
    }

    return NextResponse.json({
      data: store,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getSettingsContext()

    if (!context) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    if (!context.profileActive) {
      return NextResponse.json({ error: "Perfil do usuário está inativo." }, { status: 403 })
    }

    const body = await request.json()
    const payload = toStoreSettingsMutationInput(body)
    const store = await updateStoreSettings(context, payload)

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
    }

    return NextResponse.json({ data: store })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
