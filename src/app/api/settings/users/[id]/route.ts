import { NextRequest, NextResponse } from "next/server"

import {
  getSettingsErrorMessage,
  getSettingsErrorStatus,
  storeUserUpdateSchema,
} from "@/lib/settings"
import {
  getSettingsContext,
  updateStoreUser,
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
    const payload = storeUserUpdateSchema.parse(body)
    const user = await updateStoreUser(context, params.id, payload)

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
