import { NextResponse } from "next/server"

import {
  type CashCurrentSession,
  type CashSummary,
} from "@/lib/cash"
import { parseDbMoneyToCents } from "@/lib/products"
import { createClient } from "@/lib/supabase/server"

type ProfileRecord = {
  store_id: string | null
}

type TerminalRecord = {
  id: string
  name: string
}

type CashSessionRecord = {
  id: string
  cash_terminal_id: string
  opened_by: string | null
  status: string
  opening_amount: number | string | null
  expected_amount: number | string | null
  closing_amount: number | string | null
  difference: number | string | null
  opened_at: string
  closed_at: string | null
  notes: string | null
}

type ProfileNameRecord = {
  name: string | null
}

type CashMovementRecord = {
  movement_type: string
  amount: number | string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return String(error)
}

function toCashCurrentSession(
  session: CashSessionRecord,
  terminalName: string,
  operatorName: string
): CashCurrentSession {
  return {
    id: session.id,
    cashTerminalId: session.cash_terminal_id,
    terminalName,
    openedByUserId: session.opened_by,
    operatorName,
    openedAutomatically: session.opened_by === null,
    status: session.status,
    openingAmountCents: parseDbMoneyToCents(session.opening_amount),
    expectedAmountCents: parseDbMoneyToCents(session.expected_amount),
    closingAmountCents:
      session.closing_amount === null
        ? null
        : parseDbMoneyToCents(session.closing_amount),
    differenceCents:
      session.difference === null
        ? null
        : parseDbMoneyToCents(session.difference),
    openedAt: session.opened_at,
    closedAt: session.closed_at,
    notes: session.notes,
  }
}

function toCashSummary(
  session: CashCurrentSession,
  movements: CashMovementRecord[]
): CashSummary {
  const totalSalesCents = movements
    .filter((movement) => movement.movement_type === "SALE")
    .reduce((sum, movement) => sum + parseDbMoneyToCents(movement.amount), 0)
  const salesCount = movements.filter(
    (movement) => movement.movement_type === "SALE"
  ).length
  const suppliesCents = movements
    .filter((movement) => movement.movement_type === "SUPPLY")
    .reduce((sum, movement) => sum + parseDbMoneyToCents(movement.amount), 0)
  const withdrawalsCents = movements
    .filter((movement) => movement.movement_type === "WITHDRAWAL")
    .reduce((sum, movement) => sum + parseDbMoneyToCents(movement.amount), 0)
  const refundsCents = movements
    .filter((movement) => movement.movement_type === "REFUND")
    .reduce((sum, movement) => sum + parseDbMoneyToCents(movement.amount), 0)

  return {
    sessionId: session.id,
    totalSalesCents,
    salesCount,
    suppliesCents,
    withdrawalsCents,
    expectedAmountCents:
      session.openingAmountCents +
      totalSalesCents +
      suppliesCents -
      withdrawalsCents -
      refundsCents,
  }
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

    const storeId = (profile as ProfileRecord | null)?.store_id ?? null

    if (!storeId) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      )
    }

    const { data: terminal, error: terminalError } = await supabase
      .from("cash_terminals")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (terminalError) {
      throw terminalError
    }

    if (!terminal) {
      return NextResponse.json(
        { error: "Nenhum terminal encontrado" },
        { status: 404 }
      )
    }

    const activeTerminal = terminal as TerminalRecord

    const { data: existingSession, error: sessionError } = await supabase
      .from("cash_sessions")
      .select(
        "id, cash_terminal_id, opened_by, status, opening_amount, expected_amount, closing_amount, difference, opened_at, closed_at, notes"
      )
      .eq("cash_terminal_id", activeTerminal.id)
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) {
      throw sessionError
    }

    let activeSession = (existingSession as CashSessionRecord | null) ?? null

    if (!activeSession) {
      const { data: newSession, error: createError } = await supabase
        .from("cash_sessions")
        .insert({
          cash_terminal_id: activeTerminal.id,
          status: "OPEN",
          opening_amount: 0,
          expected_amount: 0,
          opened_at: new Date().toISOString(),
          notes: "Sessão aberta automaticamente pelo sistema",
        })
        .select(
          "id, cash_terminal_id, opened_by, status, opening_amount, expected_amount, closing_amount, difference, opened_at, closed_at, notes"
        )
        .single()

      if (createError) {
        console.error("Erro ao criar sessão:", createError)

        return NextResponse.json(
          { error: createError.message },
          { status: 500 }
        )
      }

      activeSession = newSession as CashSessionRecord
    }

    let operatorName = "Sistema"

    if (activeSession.opened_by) {
      const { data: openedByProfile, error: openedByError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", activeSession.opened_by)
        .maybeSingle()

      if (openedByError) {
        throw openedByError
      }

      operatorName =
        ((openedByProfile as ProfileNameRecord | null)?.name ?? "").trim() ||
        "Sistema"
    }

    const mappedSession = toCashCurrentSession(
      activeSession,
      activeTerminal.name,
      operatorName
    )

    const { data: movements, error: movementsError } = await supabase
      .from("cash_movements")
      .select("movement_type, amount")
      .eq("cash_session_id", mappedSession.id)

    if (movementsError) {
      throw movementsError
    }

    return NextResponse.json({
      data: mappedSession,
      summary: toCashSummary(
        mappedSession,
        (movements ?? []) as CashMovementRecord[]
      ),
    })
  } catch (error) {
    console.error("current-session error:", error)

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
