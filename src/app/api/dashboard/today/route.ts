import { NextResponse } from "next/server"

import { parseDbMoneyToCents } from "@/lib/products"
import {
  getDayRangeUtc,
  getTodayDateStringInTimeZone,
} from "@/lib/store-time"
import { createClient } from "@/lib/supabase/server"

type ProfileRecord = {
  store_id: string | null
}

type SaleRecord = {
  total: number | string | null
  status: string | null
}

type TerminalRecord = {
  id: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return String(error)
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!(profile as ProfileRecord | null)?.store_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      )
    }

    const storeId = (profile as ProfileRecord).store_id
    const todayDate = getTodayDateStringInTimeZone("America/Sao_Paulo")
    const { start, end } = getDayRangeUtc(todayDate, "America/Sao_Paulo")

    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("total, status")
      .eq("store_id", storeId)
      .gte("completed_at", start.toISOString())
      .lt("completed_at", end.toISOString())

    if (salesError) {
      throw salesError
    }

    const salesRows = (sales ?? []) as SaleRecord[]
    const completed = salesRows.filter((sale) => sale.status === "COMPLETED")
    const totalValue = completed.reduce(
      (sum, sale) => sum + parseDbMoneyToCents(sale.total),
      0
    )
    const totalCount = completed.length
    const cancelledCount = salesRows.filter(
      (sale) => sale.status === "CANCELLED"
    ).length
    const averageTicket =
      totalCount > 0 ? Math.round(totalValue / totalCount) : 0

    const { data: terminals, error: terminalsError } = await supabase
      .from("cash_terminals")
      .select("id")
      .eq("store_id", storeId)
      .eq("active", true)

    if (terminalsError) {
      throw terminalsError
    }

    const terminalIds = ((terminals ?? []) as TerminalRecord[]).map(
      (terminal) => terminal.id
    )

    let cashSessionOpen = false

    if (terminalIds.length > 0) {
      const { data: session, error: sessionError } = await supabase
        .from("cash_sessions")
        .select("id")
        .in("cash_terminal_id", terminalIds)
        .eq("status", "OPEN")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionError) {
        throw sessionError
      }

      cashSessionOpen = Boolean(session)
    }

    return NextResponse.json({
      total_value: totalValue,
      total_count: totalCount,
      average_ticket: averageTicket,
      cancelled_count: cancelledCount,
      cash_session_open: cashSessionOpen,
    })
  } catch (error) {
    console.error("dashboard/today error:", error)

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
