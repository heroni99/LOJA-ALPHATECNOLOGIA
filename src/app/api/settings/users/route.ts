import { NextResponse } from "next/server"

import { getSettingsErrorMessage, getSettingsErrorStatus } from "@/lib/settings"
import {
  getSettingsContext,
  listStoreRoles,
  listStoreUsers,
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

    const [users, roles] = await Promise.all([
      listStoreUsers(context),
      listStoreRoles(context),
    ])

    return NextResponse.json({
      data: users,
      roles,
      currentUserId: context.userId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: getSettingsErrorMessage(error) },
      { status: getSettingsErrorStatus(error) }
    )
  }
}
