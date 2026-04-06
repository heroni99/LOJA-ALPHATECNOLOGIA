import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  CASH_RECENT_MOVEMENTS_LIMIT,
  type CashCloseMutationInput,
  type CashCurrentSession,
  type CashMovement,
  type CashSummary,
  type CashSupplyMutationInput,
  type CashWithdrawalMutationInput,
} from "@/lib/cash"
import { parseDbMoneyToCents } from "@/lib/products"

type CashTerminalRecord = {
  id: string
  name: string
  active: boolean
  created_at: string
}

type CashSessionRecord = {
  id: string
  cash_terminal_id: string
  opened_by: string
  closed_by: string | null
  status: string
  opening_amount: number | string | null
  expected_amount: number | string | null
  closing_amount: number | string | null
  difference: number | string | null
  opened_at: string
  closed_at: string | null
  notes: string | null
}

type ProfileRecord = {
  id: string
  name: string | null
}

type CashMovementRecord = {
  id: string
  movement_type: string
  amount: number | string | null
  payment_method: string | null
  description: string | null
  user_id: string
  created_at: string
  profiles?: { id: string; name: string | null } | { id: string; name: string | null }[] | null
}

type SaleRecord = {
  id: string
  total: number | string | null
}

type SalePaymentRecord = {
  sale_id: string
  amount: number | string | null
}

type CashMovementTotalRecord = {
  movement_type: string
  amount: number | string | null
}

type CashCloseResult = {
  sessionId: string
  expectedAmountCents: number
  closingAmountCents: number
  differenceCents: number
}

type CashDashboardData = {
  session: CashCurrentSession
  summary: CashSummary
  movements: CashMovement[]
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function mapCashMovement(record: CashMovementRecord): CashMovement {
  const profile = getSingleRelation(record.profiles)

  return {
    id: record.id,
    movementType: record.movement_type,
    amountCents: parseDbMoneyToCents(record.amount),
    paymentMethod: record.payment_method,
    description: record.description,
    userName: profile?.name ?? null,
    createdAt: record.created_at,
  }
}

function mapCashSession(
  record: CashSessionRecord,
  terminalName: string,
  operatorName: string
): CashCurrentSession {
  return {
    id: record.id,
    cashTerminalId: record.cash_terminal_id,
    terminalName,
    openedByUserId: record.opened_by,
    operatorName,
    status: record.status,
    openingAmountCents: parseDbMoneyToCents(record.opening_amount),
    expectedAmountCents: parseDbMoneyToCents(record.expected_amount),
    closingAmountCents:
      record.closing_amount === null
        ? null
        : parseDbMoneyToCents(record.closing_amount),
    differenceCents:
      record.difference === null ? null : parseDbMoneyToCents(record.difference),
    openedAt: record.opened_at,
    closedAt: record.closed_at,
    notes: record.notes,
  }
}

async function listStoreCashTerminals(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_terminals")
    .select("id, name, active, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as CashTerminalRecord[]
}

async function getProfileName(profileId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProfileRecord | null)?.name ?? "Operador"
}

async function getStoreTerminalMap(storeId: string) {
  const terminals = await listStoreCashTerminals(storeId)

  return new Map(terminals.map((terminal) => [terminal.id, terminal]))
}

async function getOperationalCashTerminal(storeId: string) {
  const terminals = await listStoreCashTerminals(storeId)
  const activeTerminal = terminals.find((terminal) => terminal.active)

  if (activeTerminal) {
    return activeTerminal
  }

  const firstTerminal = terminals[0]

  if (firstTerminal) {
    const supabase = await createClient({ serviceRole: true })
    const { data, error } = await supabase
      .from("cash_terminals")
      .update({ active: true })
      .eq("id", firstTerminal.id)
      .select("id, name, active, created_at")
      .single()

    if (error) {
      throw error
    }

    return data as CashTerminalRecord
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_terminals")
    .insert({
      store_id: storeId,
      name: "Caixa Principal",
      active: true,
    })
    .select("id, name, active, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as CashTerminalRecord
}

async function getOpenCashSessionRecord(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const terminals = await listStoreCashTerminals(storeId)

  if (terminals.length === 0) {
    return null
  }

  const terminalIds = terminals.map((terminal) => terminal.id)
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      "id, cash_terminal_id, opened_by, closed_by, status, opening_amount, expected_amount, closing_amount, difference, opened_at, closed_at, notes"
    )
    .in("cash_terminal_id", terminalIds)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as CashSessionRecord | null
}

async function getCashSessionById(sessionId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const terminalMap = await getStoreTerminalMap(storeId)
  const terminalIds = Array.from(terminalMap.keys())

  if (terminalIds.length === 0) {
    return null
  }

  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      "id, cash_terminal_id, opened_by, closed_by, status, opening_amount, expected_amount, closing_amount, difference, opened_at, closed_at, notes"
    )
    .eq("id", sessionId)
    .in("cash_terminal_id", terminalIds)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const operatorName = await getProfileName(data.opened_by)
  const terminalName =
    terminalMap.get(data.cash_terminal_id)?.name ?? "Caixa Principal"

  return mapCashSession(data as CashSessionRecord, terminalName, operatorName)
}

async function createAutomaticCashSession(storeId: string, userId: string) {
  const terminal = await getOperationalCashTerminal(storeId)
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      cash_terminal_id: terminal.id,
      opened_by: userId,
      status: "OPEN",
      opening_amount: 0,
      expected_amount: 0,
      notes: "Abertura automática do sistema",
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  const session = await getCashSessionById(data.id, storeId)

  if (!session) {
    throw new Error("Não foi possível criar a sessão de caixa.")
  }

  return session
}

async function getSessionSalesData(sessionId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select("id, total")
    .eq("cash_session_id", sessionId)
    .in("status", ["COMPLETED", "PARTIALLY_REFUNDED"])

  if (error) {
    throw error
  }

  const sales = (data ?? []) as SaleRecord[]
  const saleIds = sales.map((sale) => sale.id)
  let cashSalesCents = 0

  if (saleIds.length > 0) {
    const paymentsResult = await supabase
      .from("sale_payments")
      .select("sale_id, amount")
      .in("sale_id", saleIds)
      .eq("method", "CASH")

    if (paymentsResult.error) {
      throw paymentsResult.error
    }

    cashSalesCents = ((paymentsResult.data ?? []) as SalePaymentRecord[]).reduce(
      (total, payment) => total + parseDbMoneyToCents(payment.amount),
      0
    )
  }

  return {
    salesCount: sales.length,
    totalSalesCents: sales.reduce(
      (total, sale) => total + parseDbMoneyToCents(sale.total),
      0
    ),
    cashSalesCents,
  }
}

async function listCashMovementsBySession(sessionId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_movements")
    .select(
      "id, movement_type, amount, payment_method, description, user_id, created_at, profiles(id, name)"
    )
    .eq("cash_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(CASH_RECENT_MOVEMENTS_LIMIT)

  if (error) {
    throw error
  }

  return ((data ?? []) as CashMovementRecord[]).map(mapCashMovement)
}

async function getCashMovementTotalsBySession(sessionId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_movements")
    .select("movement_type, amount")
    .eq("cash_session_id", sessionId)

  if (error) {
    throw error
  }

  return (data ?? []) as CashMovementTotalRecord[]
}

async function buildCashSummary(session: CashCurrentSession): Promise<CashSummary> {
  const [salesData, movementTotals] = await Promise.all([
    getSessionSalesData(session.id),
    getCashMovementTotalsBySession(session.id),
  ])

  const suppliesCents = movementTotals
    .filter((movement) => movement.movement_type === "SUPPLY")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)
  const withdrawalsCents = movementTotals
    .filter((movement) => movement.movement_type === "WITHDRAWAL")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)

  return {
    sessionId: session.id,
    totalSalesCents: salesData.totalSalesCents,
    salesCount: salesData.salesCount,
    suppliesCents,
    withdrawalsCents,
    expectedAmountCents:
      session.openingAmountCents +
      salesData.cashSalesCents +
      suppliesCents -
      withdrawalsCents,
  }
}

function mergeSessionNotes(
  existingNotes: string | null | undefined,
  closingNotes: string | null | undefined
) {
  const existing = normalizeOptionalString(existingNotes)
  const closing = normalizeOptionalString(closingNotes)

  if (!existing) {
    return closing
  }

  if (!closing) {
    return existing
  }

  return `${existing}\n\nFechamento: ${closing}`
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

export async function getOrCreateCurrentCashSession(storeId: string, userId: string) {
  const existingSession = await getOpenCashSessionRecord(storeId)

  if (existingSession) {
    const terminalMap = await getStoreTerminalMap(storeId)
    const operatorName = await getProfileName(existingSession.opened_by)
    const terminalName =
      terminalMap.get(existingSession.cash_terminal_id)?.name ?? "Caixa Principal"

    return mapCashSession(existingSession, terminalName, operatorName)
  }

  return createAutomaticCashSession(storeId, userId)
}

export async function getCurrentCashSummary(storeId: string, userId: string) {
  const session = await getOrCreateCurrentCashSession(storeId, userId)

  return buildCashSummary(session)
}

export async function getCurrentCashMovements(storeId: string, userId: string) {
  const session = await getOrCreateCurrentCashSession(storeId, userId)

  return listCashMovementsBySession(session.id)
}

export async function getCashDashboardData(
  storeId: string,
  userId: string
): Promise<CashDashboardData> {
  const session = await getOrCreateCurrentCashSession(storeId, userId)
  const [summary, movements] = await Promise.all([
    buildCashSummary(session),
    listCashMovementsBySession(session.id),
  ])

  return {
    session,
    summary,
    movements,
  }
}

export async function createCashSupply(
  storeId: string,
  userId: string,
  input: CashSupplyMutationInput
) {
  const session = await getOrCreateCurrentCashSession(storeId, userId)
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      cash_session_id: session.id,
      movement_type: "SUPPLY",
      amount: input.amount,
      payment_method: "CASH",
      description: input.description,
      user_id: userId,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  const summary = await buildCashSummary(session)

  return {
    movementId: data.id,
    summary,
  }
}

export async function createCashWithdrawal(
  storeId: string,
  userId: string,
  input: CashWithdrawalMutationInput
) {
  const session = await getOrCreateCurrentCashSession(storeId, userId)
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      cash_session_id: session.id,
      movement_type: "WITHDRAWAL",
      amount: input.amount,
      payment_method: "CASH",
      description: input.description,
      user_id: userId,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  const summary = await buildCashSummary(session)

  return {
    movementId: data.id,
    summary,
  }
}

export async function closeCurrentCashSession(
  storeId: string,
  userId: string,
  input: CashCloseMutationInput
): Promise<CashCloseResult> {
  const session = await getOrCreateCurrentCashSession(storeId, userId)
  const summary = await buildCashSummary(session)
  const differenceCents = input.closing_amount - summary.expectedAmountCents
  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("cash_sessions")
    .update({
      status: "CLOSED",
      expected_amount: summary.expectedAmountCents,
      closing_amount: input.closing_amount,
      difference: differenceCents,
      closed_by: userId,
      closed_at: new Date().toISOString(),
      notes: mergeSessionNotes(session.notes, input.notes),
    })
    .eq("id", session.id)

  if (error) {
    throw error
  }

  return {
    sessionId: session.id,
    expectedAmountCents: summary.expectedAmountCents,
    closingAmountCents: input.closing_amount,
    differenceCents,
  }
}
