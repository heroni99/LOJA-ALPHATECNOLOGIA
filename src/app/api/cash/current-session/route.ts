import { NextResponse } from "next/server"

import { getCurrentCashSessionWithSummary } from "@/lib/cash-server"
import { createClient, getCurrentUser } from "@/lib/supabase/server"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const supabase = await createClient({ serviceRole: true })
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!profile?.store_id) {
      return NextResponse.json(
        { error: "Perfil sem store_id" },
        { status: 400 }
      )
    }

    const { data: terminal, error: terminalError } = await supabase
      .from("cash_terminals")
      .select("id")
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (terminalError) {
      throw terminalError
    }

    if (!terminal) {
      return NextResponse.json(
        { error: "Nenhum terminal de caixa encontrado" },
        { status: 404 }
      )
    }

    const { session, summary } = await getCurrentCashSessionWithSummary(
      profile.store_id,
      user.id
    )

    return NextResponse.json({
      data: session,
      summary,
    })
  } catch (error) {
    console.error("cash/current-session error:", error)

    return NextResponse.json(
      { error: "Erro ao buscar sessão", details: String(error) },
      { status: 500 }
    )
  }
}
