import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  CUSTOMERS_PAGE_SIZE,
  type CustomerDetail,
  type CustomerListFilters,
  type CustomerMutationInput,
  type CustomerReceivable,
  type CustomerSale,
  type CustomerServiceOrder,
  type CustomerSummary,
} from "@/lib/customers"
import { parseDbMoneyToCents } from "@/lib/products"

type CustomerRecord = {
  id: string
  name: string
  phone: string | null
  phone2: string | null
  email: string | null
  cpf_cnpj: string | null
  zip_code: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type SaleRecord = {
  id: string
  sale_number: string
}

type ServiceOrderRecord = {
  id: string
  order_number: string
}

type ReceivableRecord = {
  id: string
  description: string
  amount: number | string | null
  due_date: string
  status: string
  received_at: string | null
  sale_id: string | null
  service_order_id: string | null
}

type ListCustomersResult = {
  items: CustomerSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

type CustomerFullDetail = {
  customer: CustomerDetail
  sales: CustomerSale[]
  serviceOrders: CustomerServiceOrder[]
  receivables: CustomerReceivable[]
}

function mapCustomerSummary(record: Pick<CustomerRecord, "id" | "name" | "phone" | "cpf_cnpj" | "city" | "state" | "active">): CustomerSummary {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    cpfCnpj: record.cpf_cnpj,
    city: record.city,
    state: record.state,
    active: record.active,
  }
}

function mapCustomerDetail(record: CustomerRecord): CustomerDetail {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    phone2: record.phone2,
    email: record.email,
    cpfCnpj: record.cpf_cnpj,
    zipCode: record.zip_code,
    address: record.address,
    city: record.city,
    state: record.state,
    notes: record.notes,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
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

  return new Map(((data ?? []) as SaleRecord[]).map((sale) => [sale.id, sale]))
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

  return new Map(((data ?? []) as ServiceOrderRecord[]).map((order) => [order.id, order]))
}

export async function listCustomers(
  storeId: string,
  filters: CustomerListFilters
): Promise<ListCustomersResult> {
  const supabase = await createClient({ serviceRole: true })
  const pageSize = filters.limit || CUSTOMERS_PAGE_SIZE
  const buildQuery = (page: number) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("customers")
      .select("id, name, phone, cpf_cnpj, city, state, active", {
        count: "exact",
      })
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .range(from, to)

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()

      query = query.or(
        `name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,phone2.ilike.%${sanitized}%,cpf_cnpj.ilike.%${sanitized}%`
      )
    }

    if (filters.active !== null) {
      query = query.eq("active", filters.active)
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
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)

    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  return {
    items: ((data ?? []) as Array<
      Pick<CustomerRecord, "id" | "name" | "phone" | "cpf_cnpj" | "city" | "state" | "active">
    >).map(mapCustomerSummary),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize,
  }
}

export async function getCustomerById(customerId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, phone2, email, cpf_cnpj, zip_code, address, city, state, notes, active, created_at, updated_at"
    )
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapCustomerDetail(data as CustomerRecord)
}

export async function getCustomerSales(
  customerId: string,
  storeId: string
): Promise<CustomerSale[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, status, total, created_at, completed_at")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []).map((sale) => ({
    id: sale.id,
    saleNumber: sale.sale_number,
    status: sale.status,
    totalCents: parseDbMoneyToCents(sale.total),
    createdAt: sale.created_at,
    completedAt: sale.completed_at,
  }))
}

export async function getCustomerServiceOrders(
  customerId: string,
  storeId: string
): Promise<CustomerServiceOrder[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("service_orders")
    .select("id, order_number, status, device_type, brand, model, total_final, created_at")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []).map((serviceOrder) => ({
    id: serviceOrder.id,
    orderNumber: serviceOrder.order_number,
    status: serviceOrder.status,
    deviceType: serviceOrder.device_type,
    brand: serviceOrder.brand,
    model: serviceOrder.model,
    totalFinalCents: parseDbMoneyToCents(serviceOrder.total_final),
    createdAt: serviceOrder.created_at,
  }))
}

export async function getCustomerReceivables(
  customerId: string,
  storeId: string
): Promise<CustomerReceivable[]> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("accounts_receivable")
    .select("id, description, amount, due_date, status, received_at, sale_id, service_order_id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .order("due_date", { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  const receivables = (data ?? []) as ReceivableRecord[]
  const saleIds = Array.from(
    new Set(
      receivables
        .map((item) => item.sale_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const serviceOrderIds = Array.from(
    new Set(
      receivables
        .map((item) => item.service_order_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const [salesMap, serviceOrdersMap] = await Promise.all([
    listSalesByIds(storeId, saleIds),
    listServiceOrdersByIds(storeId, serviceOrderIds),
  ])

  return receivables.map((receivable) => ({
    id: receivable.id,
    description: receivable.description,
    amountCents: parseDbMoneyToCents(receivable.amount),
    dueDate: receivable.due_date,
    status: receivable.status,
    receivedAt: receivable.received_at,
    saleId: receivable.sale_id,
    saleNumber: receivable.sale_id
      ? salesMap.get(receivable.sale_id)?.sale_number ?? null
      : null,
    serviceOrderId: receivable.service_order_id,
    serviceOrderNumber: receivable.service_order_id
      ? serviceOrdersMap.get(receivable.service_order_id)?.order_number ?? null
      : null,
  }))
}

export async function getCustomerFullDetail(
  customerId: string,
  storeId: string
): Promise<CustomerFullDetail | null> {
  const customer = await getCustomerById(customerId, storeId)

  if (!customer) {
    return null
  }

  const [sales, serviceOrders, receivables] = await Promise.all([
    getCustomerSales(customerId, storeId),
    getCustomerServiceOrders(customerId, storeId),
    getCustomerReceivables(customerId, storeId),
  ])

  return {
    customer,
    sales,
    serviceOrders,
    receivables,
  }
}

export async function createCustomer(
  storeId: string,
  input: CustomerMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .insert({
      store_id: storeId,
      ...input,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return getCustomerById(data.id, storeId)
}

export async function updateCustomer(
  customerId: string,
  storeId: string,
  input: CustomerMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle()

  if (existingCustomerError) {
    throw existingCustomerError
  }

  if (!existingCustomer) {
    return null
  }

  const { error } = await supabase
    .from("customers")
    .update(input)
    .eq("store_id", storeId)
    .eq("id", customerId)

  if (error) {
    throw error
  }

  return getCustomerById(customerId, storeId)
}

export async function softDeleteCustomer(customerId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .update({ active: false })
    .eq("store_id", storeId)
    .eq("id", customerId)
    .select("id")
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}
