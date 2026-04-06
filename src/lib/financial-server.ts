import "server-only"

import { addDays } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import {
  FINANCIAL_PAGE_SIZE,
  type AccountFilters,
  type AccountPayableMutationInput,
  type AccountPayableSummary,
  type AccountReceivableSummary,
  type AccountSettlementMutationInput,
  type FinancialSummary,
  isAccountOverdue,
} from "@/lib/financial"
import { parseDbMoneyToCents } from "@/lib/products"

type AccountsPayableRecord = {
  id: string
  supplier_id: string | null
  purchase_order_id: string | null
  description: string
  amount: number | string | null
  due_date: string
  paid_at: string | null
  status: string
  payment_method: string | null
  notes: string | null
}

type AccountsReceivableRecord = {
  id: string
  customer_id: string | null
  sale_id: string | null
  service_order_id: string | null
  description: string
  amount: number | string | null
  due_date: string
  received_at: string | null
  status: string
  payment_method: string | null
  notes: string | null
}

type SupplierRecord = {
  id: string
  name: string | null
  trade_name: string | null
}

type CustomerRecord = {
  id: string
  name: string
}

type SaleRecord = {
  id: string
  sale_number: string
}

type ServiceOrderRecord = {
  id: string
  order_number: string
}

type AccountsListResult<T> = {
  items: T[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function formatSupplierName(record: SupplierRecord | null | undefined) {
  return record?.trade_name ?? record?.name ?? null
}

async function listSuppliersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, SupplierRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, trade_name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as SupplierRecord[]).map((item) => [item.id, item]))
}

async function listCustomersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, CustomerRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as CustomerRecord[]).map((item) => [item.id, item]))
}

async function listSalesByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, SaleRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as SaleRecord[]).map((item) => [item.id, item]))
}

async function listServiceOrdersByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ServiceOrderRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("service_orders")
    .select("id, order_number")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ServiceOrderRecord[]).map((item) => [item.id, item]))
}

async function getAccountPayableRecord(accountId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("accounts_payable")
    .select("id, amount, status, notes")
    .eq("store_id", storeId)
    .eq("id", accountId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getAccountReceivableRecord(accountId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("accounts_receivable")
    .select("id, amount, status, notes")
    .eq("store_id", storeId)
    .eq("id", accountId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function ensureSupplierInStore(storeId: string, supplierId: string | null) {
  if (!supplierId) {
    return
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", supplierId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("O fornecedor selecionado não pertence à loja atual.")
  }
}

export async function getFinancialSummary(storeId: string): Promise<FinancialSummary> {
  const supabase = await createClient({ serviceRole: true })
  const today = getTodayDate()
  const nextWeek = addDays(new Date(), 7).toISOString().slice(0, 10)

  const [payablesResult, receivablesResult] = await Promise.all([
    supabase
      .from("accounts_payable")
      .select("id, supplier_id, description, amount, due_date, paid_at, status")
      .eq("store_id", storeId)
      .not("status", "in", "(PAID,CANCELLED)"),
    supabase
      .from("accounts_receivable")
      .select("id, customer_id, description, amount, due_date, received_at, status")
      .eq("store_id", storeId)
      .not("status", "in", "(RECEIVED,CANCELLED)"),
  ])

  if (payablesResult.error) {
    throw payablesResult.error
  }

  if (receivablesResult.error) {
    throw receivablesResult.error
  }

  const payables = (payablesResult.data ?? []) as Array<
    Pick<
      AccountsPayableRecord,
      "id" | "supplier_id" | "description" | "amount" | "due_date" | "paid_at" | "status"
    >
  >
  const receivables = (receivablesResult.data ?? []) as Array<
    Pick<
      AccountsReceivableRecord,
      "id" | "customer_id" | "description" | "amount" | "due_date" | "received_at" | "status"
    >
  >
  const [supplierMap, customerMap] = await Promise.all([
    listSuppliersByIds(
      Array.from(
        new Set(
          payables
            .map((item) => item.supplier_id)
            .filter((value): value is string => Boolean(value))
        )
      )
    ),
    listCustomersByIds(
      Array.from(
        new Set(
          receivables
            .map((item) => item.customer_id)
            .filter((value): value is string => Boolean(value))
        )
      )
    ),
  ])

  const receivableTotalCents = receivables.reduce(
    (sum, item) => sum + parseDbMoneyToCents(item.amount),
    0
  )
  const payableTotalCents = payables.reduce(
    (sum, item) => sum + parseDbMoneyToCents(item.amount),
    0
  )
  const overdueReceivableCents = receivables
    .filter((item) => isAccountOverdue(item.due_date, item.status, item.received_at))
    .reduce((sum, item) => sum + parseDbMoneyToCents(item.amount), 0)
  const overduePayableCents = payables
    .filter((item) => isAccountOverdue(item.due_date, item.status, item.paid_at))
    .reduce((sum, item) => sum + parseDbMoneyToCents(item.amount), 0)

  return {
    receivableTotalCents,
    payableTotalCents,
    overdueReceivableCents,
    overduePayableCents,
    upcomingReceivables: receivables
      .filter((item) => item.due_date >= today && item.due_date <= nextWeek)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 7)
      .map((item) => ({
        id: item.id,
        description: item.description,
        counterpartyName: item.customer_id
          ? customerMap.get(item.customer_id)?.name ?? null
          : null,
        amountCents: parseDbMoneyToCents(item.amount),
        dueDate: item.due_date,
        kind: "receivable" as const,
      })),
    upcomingPayables: payables
      .filter((item) => item.due_date >= today && item.due_date <= nextWeek)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 7)
      .map((item) => ({
        id: item.id,
        description: item.description,
        counterpartyName: item.supplier_id
          ? formatSupplierName(supplierMap.get(item.supplier_id))
          : null,
        amountCents: parseDbMoneyToCents(item.amount),
        dueDate: item.due_date,
        kind: "payable" as const,
      })),
  }
}

export async function listAccountsPayable(
  storeId: string,
  filters: AccountFilters<string>
): Promise<AccountsListResult<AccountPayableSummary>> {
  const supabase = await createClient({ serviceRole: true })

  const buildQuery = (page: number) => {
    const from = (page - 1) * FINANCIAL_PAGE_SIZE
    const to = from + FINANCIAL_PAGE_SIZE - 1
    let query = supabase
      .from("accounts_payable")
      .select(
        "id, supplier_id, purchase_order_id, description, amount, due_date, paid_at, status, payment_method, notes",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("due_date", { ascending: true })
      .range(from, to)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.dueFrom) {
      query = query.gte("due_date", filters.dueFrom)
    }

    if (filters.dueTo) {
      query = query.lte("due_date", filters.dueTo)
    }

    return query
  }

  const initialResult = await buildQuery(filters.page)
  let data = initialResult.data
  let error = initialResult.error
  const totalCountResult = initialResult.count

  if (error) {
    throw error
  }

  const totalCount = totalCountResult ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / FINANCIAL_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)
    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  const records = (data ?? []) as AccountsPayableRecord[]
  const supplierIds = Array.from(
    new Set(
      records
        .map((record) => record.supplier_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const supplierMap = await listSuppliersByIds(supplierIds)

  return {
    items: records.map((record) => ({
      id: record.id,
      supplierName: record.supplier_id
        ? formatSupplierName(supplierMap.get(record.supplier_id))
        : null,
      description: record.description,
      amountCents: parseDbMoneyToCents(record.amount),
      dueDate: record.due_date,
      paidAt: record.paid_at,
      status: record.status as AccountPayableSummary["status"],
      paymentMethod: record.payment_method,
      notes: record.notes,
      purchaseOrderId: record.purchase_order_id,
      isOverdue: isAccountOverdue(record.due_date, record.status, record.paid_at),
    })),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: FINANCIAL_PAGE_SIZE,
  }
}

export async function listAccountsReceivable(
  storeId: string,
  filters: AccountFilters<string>
): Promise<AccountsListResult<AccountReceivableSummary>> {
  const supabase = await createClient({ serviceRole: true })

  const buildQuery = (page: number) => {
    const from = (page - 1) * FINANCIAL_PAGE_SIZE
    const to = from + FINANCIAL_PAGE_SIZE - 1
    let query = supabase
      .from("accounts_receivable")
      .select(
        "id, customer_id, sale_id, service_order_id, description, amount, due_date, received_at, status, payment_method, notes",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("due_date", { ascending: true })
      .range(from, to)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.dueFrom) {
      query = query.gte("due_date", filters.dueFrom)
    }

    if (filters.dueTo) {
      query = query.lte("due_date", filters.dueTo)
    }

    return query
  }

  const initialResult = await buildQuery(filters.page)
  let data = initialResult.data
  let error = initialResult.error
  const totalCountResult = initialResult.count

  if (error) {
    throw error
  }

  const totalCount = totalCountResult ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / FINANCIAL_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)
    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  const records = (data ?? []) as AccountsReceivableRecord[]
  const [customerMap, saleMap, serviceOrderMap] = await Promise.all([
    listCustomersByIds(
      Array.from(
        new Set(
          records
            .map((record) => record.customer_id)
            .filter((value): value is string => Boolean(value))
        )
      )
    ),
    listSalesByIds(
      storeId,
      Array.from(
        new Set(
          records
            .map((record) => record.sale_id)
            .filter((value): value is string => Boolean(value))
        )
      )
    ),
    listServiceOrdersByIds(
      storeId,
      Array.from(
        new Set(
          records
            .map((record) => record.service_order_id)
            .filter((value): value is string => Boolean(value))
        )
      )
    ),
  ])

  return {
    items: records.map((record) => ({
      id: record.id,
      customerName: record.customer_id
        ? customerMap.get(record.customer_id)?.name ?? null
        : null,
      description:
        record.sale_id && saleMap.get(record.sale_id)?.sale_number
          ? `${record.description} • ${saleMap.get(record.sale_id)?.sale_number}`
          : record.service_order_id && serviceOrderMap.get(record.service_order_id)?.order_number
            ? `${record.description} • ${serviceOrderMap.get(record.service_order_id)?.order_number}`
            : record.description,
      amountCents: parseDbMoneyToCents(record.amount),
      dueDate: record.due_date,
      receivedAt: record.received_at,
      status: record.status as AccountReceivableSummary["status"],
      paymentMethod: record.payment_method,
      notes: record.notes,
      saleId: record.sale_id,
      serviceOrderId: record.service_order_id,
      isOverdue: isAccountOverdue(record.due_date, record.status, record.received_at),
    })),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: FINANCIAL_PAGE_SIZE,
  }
}

export async function createAccountPayable(
  storeId: string,
  input: AccountPayableMutationInput
) {
  await ensureSupplierInStore(storeId, input.supplier_id ?? null)

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("accounts_payable")
    .insert({
      store_id: storeId,
      supplier_id: input.supplier_id ?? null,
      description: input.description,
      amount: input.amount,
      due_date: input.due_date,
      status: "PENDING",
      notes: input.notes ?? null,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return data.id
}

export async function payAccountPayable(
  accountId: string,
  storeId: string,
  input: AccountSettlementMutationInput
) {
  const record = await getAccountPayableRecord(accountId, storeId)

  if (!record) {
    return null
  }

  if (["PAID", "CANCELLED"].includes(record.status)) {
    throw new Error("Esta conta já foi liquidada ou cancelada.")
  }

  if (parseDbMoneyToCents(record.amount) !== input.amount) {
    throw new Error("Este fluxo liquida o título integral. Ajuste o valor para o total da conta.")
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("accounts_payable")
    .update({
      paid_at: `${input.settled_at}T12:00:00.000Z`,
      status: "PAID",
      payment_method: input.payment_method,
      notes: input.notes ?? record.notes ?? null,
    })
    .eq("store_id", storeId)
    .eq("id", accountId)

  if (error) {
    throw error
  }

  return accountId
}

export async function receiveAccountReceivable(
  accountId: string,
  storeId: string,
  input: AccountSettlementMutationInput
) {
  const record = await getAccountReceivableRecord(accountId, storeId)

  if (!record) {
    return null
  }

  if (["RECEIVED", "CANCELLED"].includes(record.status)) {
    throw new Error("Esta conta já foi recebida ou cancelada.")
  }

  if (parseDbMoneyToCents(record.amount) !== input.amount) {
    throw new Error("Este fluxo liquida o título integral. Ajuste o valor para o total da conta.")
  }

  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase
    .from("accounts_receivable")
    .update({
      received_at: `${input.settled_at}T12:00:00.000Z`,
      status: "RECEIVED",
      payment_method: input.payment_method,
      notes: input.notes ?? record.notes ?? null,
    })
    .eq("store_id", storeId)
    .eq("id", accountId)

  if (error) {
    throw error
  }

  return accountId
}
