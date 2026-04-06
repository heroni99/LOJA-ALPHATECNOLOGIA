import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getOrCreateCurrentCashSession } from "@/lib/cash-server"
import { parseDbMoneyToCents } from "@/lib/products"
import type {
  SaleReturnMutationInput,
  SaleReturnSummary,
} from "@/lib/sale-returns"
import { SALE_RETURNS_PAGE_SIZE } from "@/lib/sales"

type SaleReturnRecord = {
  id: string
  sale_id: string
  customer_id: string | null
  return_number: string
  reason: string
  refund_type: string
  total_amount: number | string | null
  created_at: string
  sales?: { id: string; store_id: string } | { id: string; store_id: string }[] | null
}

type CustomerRecord = {
  id: string
  name: string
}

type SaleRecord = {
  id: string
  sale_number: string
}

type ListSaleReturnsResult = {
  items: SaleReturnSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
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

function mapSaleReturnSummary(
  record: SaleReturnRecord,
  customerMap: Map<string, CustomerRecord>,
  saleMap: Map<string, SaleRecord>
): SaleReturnSummary {
  return {
    id: record.id,
    saleId: record.sale_id,
    saleNumber: saleMap.get(record.sale_id)?.sale_number ?? null,
    customerName: record.customer_id
      ? customerMap.get(record.customer_id)?.name ?? null
      : null,
    returnNumber: record.return_number,
    reason: record.reason,
    refundType: record.refund_type,
    totalAmountCents: parseDbMoneyToCents(record.total_amount),
    createdAt: record.created_at,
  }
}

export async function listSaleReturns(
  storeId: string,
  page = 1
): Promise<ListSaleReturnsResult> {
  const supabase = await createClient({ serviceRole: true })
  const from = (page - 1) * SALE_RETURNS_PAGE_SIZE
  const to = from + SALE_RETURNS_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from("sale_returns")
    .select(
      "id, sale_id, customer_id, return_number, reason, refund_type, total_amount, created_at, sales!inner(id, store_id)",
      {
        count: "exact",
      }
    )
    .eq("sales.store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    throw error
  }

  const records = (data ?? []) as SaleReturnRecord[]
  const customerIds = Array.from(
    new Set(
      records
        .map((record) => record.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const saleIds = Array.from(new Set(records.map((record) => record.sale_id)))
  const [customerMap, saleMap] = await Promise.all([
    listCustomersByIds(customerIds),
    listSalesByIds(storeId, saleIds),
  ])
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / SALE_RETURNS_PAGE_SIZE))

  return {
    items: records.map((record) => mapSaleReturnSummary(record, customerMap, saleMap)),
    totalCount,
    totalPages,
    page: Math.min(page, totalPages),
    pageSize: SALE_RETURNS_PAGE_SIZE,
  }
}

export async function listSaleReturnsBySale(saleId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sale_returns")
    .select(
      "id, sale_id, customer_id, return_number, reason, refund_type, total_amount, created_at, sales!inner(id, store_id)"
    )
    .eq("sale_id", saleId)
    .eq("sales.store_id", storeId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  const records = (data ?? []) as SaleReturnRecord[]
  const customerIds = Array.from(
    new Set(
      records
        .map((record) => record.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const [customerMap, saleMap] = await Promise.all([
    listCustomersByIds(customerIds),
    listSalesByIds(storeId, [saleId]),
  ])

  return records.map((record) => mapSaleReturnSummary(record, customerMap, saleMap))
}

export async function createSaleReturn(
  storeId: string,
  userId: string,
  input: SaleReturnMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const cashSession =
    input.refund_type === "CASH"
      ? await getOrCreateCurrentCashSession(storeId, userId)
      : null

  const { data, error } = await supabase.rpc("sale_return_create", {
    p_store_id: storeId,
    p_user_id: userId,
    p_sale_id: input.sale_id,
    p_refund_type: input.refund_type,
    p_reason: input.reason,
    p_cash_session_id: cashSession?.id ?? null,
    p_items: input.items,
  })

  if (error) {
    throw error
  }

  return String(data)
}
