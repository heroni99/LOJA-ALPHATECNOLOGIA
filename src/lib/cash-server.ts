import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  CASH_RECENT_MOVEMENTS_LIMIT,
  type CashCloseMutationInput,
  type CashCurrentSession,
  type CashMovement,
  type CashSessionMovementSummary,
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
  opened_by: string | null
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
  user_id: string | null
  created_at: string
  profiles?: { id: string; name: string | null } | { id: string; name: string | null }[] | null
}

type CashMovementTotalRecord = {
  movement_type: string
  amount: number | string | null
}

type CashCloseRpcResult = {
  session_id: string
  expected_amount: number | string | null
  closing_amount: number | string | null
  difference: number | string | null
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

type CashCurrentSessionPayload = {
  session: CashCurrentSession
  summary: CashSummary
}

type DatabaseErrorLike = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function isDatabaseErrorLike(error: unknown): error is DatabaseErrorLike {
  return typeof error === "object" && error !== null
}

function normalizeCashError(error: unknown) {
  if (!isDatabaseErrorLike(error)) {
    return error
  }

  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ")

  if (
    error.code === "PGRST202" ||
    /Could not find the function public\.cash_/i.test(message)
  ) {
    return new Error(
      "As funções de caixa não estão instaladas no banco. Execute `supabase/cash.sql` no Supabase antes de usar este módulo."
    )
  }

  if (
    error.code === "23514" &&
    /cash_movements_amount_check/i.test(message)
  ) {
    return new Error("O valor do movimento de caixa é inválido.")
  }

  return new Error(error.message ?? "Não foi possível processar a operação de caixa.")
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
    openedAutomatically: record.opened_by === null,
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

function buildMovementSummary(
  session: CashCurrentSession,
  movementTotals: CashMovementTotalRecord[]
): CashSessionMovementSummary {
  const totalSalesCents = movementTotals
    .filter((movement) => movement.movement_type === "SALE")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)
  const salesCount = movementTotals.filter(
    (movement) => movement.movement_type === "SALE"
  ).length
  const suppliesCents = movementTotals
    .filter((movement) => movement.movement_type === "SUPPLY")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)
  const withdrawalsCents = movementTotals
    .filter((movement) => movement.movement_type === "WITHDRAWAL")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)
  const refundsCents = movementTotals
    .filter((movement) => movement.movement_type === "REFUND")
    .reduce((total, movement) => total + parseDbMoneyToCents(movement.amount), 0)

  return {
    totalSalesCents,
    salesCount,
    suppliesCents,
    withdrawalsCents,
    refundsCents,
    expectedAmountCents:
      session.openingAmountCents +
      totalSalesCents +
      suppliesCents -
      withdrawalsCents -
      refundsCents,
  }
}

function toCashSummary(
  sessionId: string,
  summary: CashSessionMovementSummary
): CashSummary {
  return {
    sessionId,
    totalSalesCents: summary.totalSalesCents,
    salesCount: summary.salesCount,
    suppliesCents: summary.suppliesCents,
    withdrawalsCents: summary.withdrawalsCents,
    expectedAmountCents: summary.expectedAmountCents,
  }
}

function applySummaryToSession(
  session: CashCurrentSession,
  summary: CashSessionMovementSummary
): CashCurrentSession {
  return {
    ...session,
    expectedAmountCents: summary.expectedAmountCents,
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

async function getProfileName(profileId: string | null) {
  if (!profileId) {
    return "Sistema"
  }

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

async function buildCashSummary(session: CashCurrentSession): Promise<CashSummary> {
  const movementTotals = await getCashMovementTotalsBySession(session.id)
  const summary = buildMovementSummary(session, movementTotals)

  return toCashSummary(session.id, summary)
}

async function getCurrentCashSessionPayload(
  storeId: string,
  userId: string
): Promise<CashCurrentSessionPayload> {
  const session = await getOrCreateCurrentCashSession(storeId, userId)
  const movementTotals = await getCashMovementTotalsBySession(session.id)
  const summary = buildMovementSummary(session, movementTotals)

  return {
    session: applySummaryToSession(session, summary),
    summary: toCashSummary(session.id, summary),
  }
}

export async function getOrCreateCurrentCashSession(storeId: string, _userId: string) {
  void _userId
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("cash_get_or_create_current_session", {
    p_store_id: storeId,
  })

  if (error) {
    throw normalizeCashError(error)
  }

  const sessionId = String(data)
  const session = await getCashSessionById(sessionId, storeId)

  if (!session) {
    throw new Error("Não foi possível carregar a sessão atual do caixa.")
  }

  return session
}

export async function getCurrentCashSessionWithSummary(storeId: string, userId: string) {
  return getCurrentCashSessionPayload(storeId, userId)
}

export async function getCurrentCashSummary(storeId: string, userId: string) {
  const payload = await getCurrentCashSessionPayload(storeId, userId)

  return payload.summary
}

export async function getCurrentCashMovements(storeId: string, userId: string) {
  const session = await getOrCreateCurrentCashSession(storeId, userId)

  return listCashMovementsBySession(session.id)
}

export async function getCashDashboardData(
  storeId: string,
  userId: string
): Promise<CashDashboardData> {
  const payload = await getCurrentCashSessionPayload(storeId, userId)
  const movements = await listCashMovementsBySession(payload.session.id)

  return {
    session: payload.session,
    summary: payload.summary,
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
      description: input.description ?? null,
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
      description: input.reason,
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
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("cash_close_current_session", {
    p_store_id: storeId,
    p_user_id: userId,
    p_closing_amount: input.closing_amount,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw normalizeCashError(error)
  }

  const result = data as CashCloseRpcResult | null

  if (!result) {
    throw new Error("Não foi possível fechar a sessão atual do caixa.")
  }

  return {
    sessionId: result.session_id,
    expectedAmountCents: parseDbMoneyToCents(result.expected_amount),
    closingAmountCents: parseDbMoneyToCents(result.closing_amount),
    differenceCents: parseDbMoneyToCents(result.difference),
  }
}
