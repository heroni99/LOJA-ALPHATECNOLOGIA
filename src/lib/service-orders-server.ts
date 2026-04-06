import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  SERVICE_ORDERS_PAGE_SIZE,
  type ServiceOrderAttachment,
  type ServiceOrderCreateMutationInput,
  type ServiceOrderCustomer,
  type ServiceOrderDetail,
  type ServiceOrderHistoryEntry,
  type ServiceOrderItem,
  type ServiceOrderListFilters,
  type ServiceOrderStatusChangeInput,
  type ServiceOrderSummary,
  type ServiceOrderUpdateMutationInput,
  type ServiceOrderItemMutationInput,
} from "@/lib/service-orders"
import { parseDbMoneyToCents } from "@/lib/products"

type ServiceOrderRecord = {
  id: string
  store_id: string
  customer_id: string
  created_by_user_id: string
  assigned_to_user_id: string | null
  order_number: string
  status: ServiceOrderDetail["status"]
  device_type: string
  brand: string | null
  model: string | null
  imei: string | null
  serial_number: string | null
  color: string | null
  accessories: string | null
  reported_issue: string
  found_issue: string | null
  technical_notes: string | null
  estimated_completion_date: string | null
  total_estimated: number | string | null
  total_final: number | string | null
  approved_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

type ServiceOrderListRecord = Pick<
  ServiceOrderRecord,
  | "id"
  | "customer_id"
  | "assigned_to_user_id"
  | "order_number"
  | "status"
  | "device_type"
  | "brand"
  | "model"
  | "created_at"
>

type ServiceOrderItemRecord = {
  id: string
  product_id: string | null
  item_type: string
  description: string
  quantity: number | string | null
  unit_price: number | string | null
  total_price: number | string | null
  stock_consumed: boolean
  created_at: string
}

type ServiceOrderHistoryRecord = {
  id: string
  old_status: ServiceOrderDetail["status"] | null
  new_status: ServiceOrderDetail["status"]
  notes: string | null
  changed_by_user_id: string | null
  created_at: string
}

type ServiceOrderAttachmentRecord = {
  id: string
  created_by_user_id: string | null
  file_name: string
  file_path: string
  file_url: string
  mime_type: string
  size_bytes: number | string | null
  created_at: string
}

type CustomerRecord = {
  id: string
  name: string
  phone: string | null
  email: string | null
  cpf_cnpj: string | null
  city: string | null
  state: string | null
}

type ProfileRecord = {
  id: string
  name: string | null
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
}

type ListServiceOrdersResult = {
  items: ServiceOrderSummary[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
}

type ServiceOrderReceiptData = {
  storeName: string
  warrantyText: string
  serviceOrder: ServiceOrderDetail
}

const DEFAULT_SERVICE_ORDER_WARRANTY_TEXT =
  "Garantia de 90 dias para o serviço executado, salvo exceções registradas nesta OS."

function mapCustomer(record: CustomerRecord | null): ServiceOrderCustomer | null {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    email: record.email,
    cpfCnpj: record.cpf_cnpj,
    city: record.city,
    state: record.state,
  }
}

function mapServiceOrderSummary(
  record: ServiceOrderListRecord,
  customerMap: Map<string, CustomerRecord>,
  profileMap: Map<string, ProfileRecord>
): ServiceOrderSummary {
  return {
    id: record.id,
    orderNumber: record.order_number,
    customerName: customerMap.get(record.customer_id)?.name ?? null,
    deviceType: record.device_type,
    brand: record.brand,
    model: record.model,
    technicianName: record.assigned_to_user_id
      ? profileMap.get(record.assigned_to_user_id)?.name ?? null
      : null,
    status: record.status,
    createdAt: record.created_at,
  }
}

function mapServiceOrderItem(
  record: ServiceOrderItemRecord,
  productMap: Map<string, ProductRecord>
): ServiceOrderItem {
  const product = record.product_id ? productMap.get(record.product_id) ?? null : null

  return {
    id: record.id,
    productId: record.product_id,
    productName: product?.name ?? null,
    internalCode: product?.internal_code ?? null,
    itemType: record.item_type,
    description: record.description,
    quantity: Number(record.quantity ?? 0),
    unitPriceCents: parseDbMoneyToCents(record.unit_price),
    totalPriceCents: parseDbMoneyToCents(record.total_price),
    stockConsumed: record.stock_consumed,
    createdAt: record.created_at,
  }
}

function mapServiceOrderHistory(
  record: ServiceOrderHistoryRecord,
  profileMap: Map<string, ProfileRecord>
): ServiceOrderHistoryEntry {
  return {
    id: record.id,
    oldStatus: record.old_status,
    newStatus: record.new_status,
    notes: record.notes,
    changedByUserId: record.changed_by_user_id,
    changedByName: record.changed_by_user_id
      ? profileMap.get(record.changed_by_user_id)?.name ?? null
      : null,
    createdAt: record.created_at,
  }
}

function mapServiceOrderAttachment(
  record: ServiceOrderAttachmentRecord,
  profileMap: Map<string, ProfileRecord>
): ServiceOrderAttachment {
  return {
    id: record.id,
    fileName: record.file_name,
    fileUrl: record.file_url,
    mimeType: record.mime_type,
    sizeBytes: Number(record.size_bytes ?? 0),
    createdAt: record.created_at,
    createdByUserId: record.created_by_user_id,
    createdByName: record.created_by_user_id
      ? profileMap.get(record.created_by_user_id)?.name ?? null
      : null,
  }
}

async function listCustomersByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, CustomerRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, cpf_cnpj, city, state")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as CustomerRecord[]).map((record) => [record.id, record]))
}

async function listProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProfileRecord[]).map((record) => [record.id, record]))
}

async function listProductsByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProductRecord>()
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code")
    .eq("store_id", storeId)
    .in("id", ids)

  if (error) {
    throw error
  }

  return new Map(((data ?? []) as ProductRecord[]).map((record) => [record.id, record]))
}

async function findCustomerIdsBySearch(storeId: string, search: string) {
  const normalized = search.trim()

  if (!normalized) {
    return [] as string[]
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .ilike("name", `%${normalized}%`)
    .limit(50)

  if (error) {
    throw error
  }

  return (data ?? []).map((customer) => customer.id)
}

async function getServiceOrderRecord(serviceOrderId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("service_orders")
    .select(
      "id, store_id, customer_id, created_by_user_id, assigned_to_user_id, order_number, status, device_type, brand, model, imei, serial_number, color, accessories, reported_issue, found_issue, technical_notes, estimated_completion_date, total_estimated, total_final, approved_at, delivered_at, created_at, updated_at"
    )
    .eq("store_id", storeId)
    .eq("id", serviceOrderId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ServiceOrderRecord | null) ?? null
}

async function ensureCustomerInStore(storeId: string, customerId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("O cliente informado não pertence à loja atual.")
  }
}

async function ensureProfileInStore(storeId: string, profileId: string | null) {
  if (!profileId) {
    return
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("O técnico informado não pertence à loja atual.")
  }
}

export async function listServiceOrders(
  storeId: string,
  filters: ServiceOrderListFilters
): Promise<ListServiceOrdersResult> {
  const supabase = await createClient({ serviceRole: true })
  const matchingCustomerIds = filters.search
    ? await findCustomerIdsBySearch(storeId, filters.search)
    : []

  const buildQuery = (page: number) => {
    const from = (page - 1) * SERVICE_ORDERS_PAGE_SIZE
    const to = from + SERVICE_ORDERS_PAGE_SIZE - 1
    let query = supabase
      .from("service_orders")
      .select(
        "id, customer_id, assigned_to_user_id, order_number, status, device_type, brand, model, created_at",
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.customerId) {
      query = query.eq("customer_id", filters.customerId)
    }

    if (filters.search) {
      const sanitized = filters.search.replace(/[(),]/g, " ").trim()
      const clauses = [
        `order_number.ilike.%${sanitized}%`,
        `device_type.ilike.%${sanitized}%`,
        `brand.ilike.%${sanitized}%`,
        `model.ilike.%${sanitized}%`,
      ]

      if (matchingCustomerIds.length > 0) {
        clauses.push(`customer_id.in.(${matchingCustomerIds.join(",")})`)
      }

      query = query.or(clauses.join(","))
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
  const totalPages = Math.max(1, Math.ceil(totalCount / SERVICE_ORDERS_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  if ((data?.length ?? 0) === 0 && totalCount > 0 && currentPage !== filters.page) {
    const fallbackResult = await buildQuery(currentPage)

    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw error
  }

  const records = (data ?? []) as ServiceOrderListRecord[]
  const customerIds = Array.from(new Set(records.map((record) => record.customer_id)))
  const profileIds = Array.from(
    new Set(
      records
        .map((record) => record.assigned_to_user_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const [customerMap, profileMap] = await Promise.all([
    listCustomersByIds(storeId, customerIds),
    listProfilesByIds(profileIds),
  ])

  return {
    items: records.map((record) =>
      mapServiceOrderSummary(record, customerMap, profileMap)
    ),
    totalCount,
    totalPages,
    page: currentPage,
    pageSize: SERVICE_ORDERS_PAGE_SIZE,
  }
}

export async function getServiceOrderFullDetail(
  serviceOrderId: string,
  storeId: string
): Promise<ServiceOrderDetail | null> {
  const serviceOrder = await getServiceOrderRecord(serviceOrderId, storeId)

  if (!serviceOrder) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })

  const [
    customerResult,
    itemsResult,
    historyResult,
    attachmentsResult,
    profileMap,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, cpf_cnpj, city, state")
      .eq("store_id", storeId)
      .eq("id", serviceOrder.customer_id)
      .maybeSingle(),
    supabase
      .from("service_order_items")
      .select(
        "id, product_id, item_type, description, quantity, unit_price, total_price, stock_consumed, created_at"
      )
      .eq("service_order_id", serviceOrderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_order_status_history")
      .select("id, old_status, new_status, notes, changed_by_user_id, created_at")
      .eq("service_order_id", serviceOrderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_order_attachments")
      .select(
        "id, created_by_user_id, file_name, file_path, file_url, mime_type, size_bytes, created_at"
      )
      .eq("service_order_id", serviceOrderId)
      .order("created_at", { ascending: false }),
    listProfilesByIds(
      Array.from(
        new Set(
          [
            serviceOrder.created_by_user_id,
            serviceOrder.assigned_to_user_id,
          ].filter((value): value is string => Boolean(value))
        )
      )
    ),
  ])

  if (customerResult.error) {
    throw customerResult.error
  }

  if (itemsResult.error) {
    throw itemsResult.error
  }

  if (historyResult.error) {
    throw historyResult.error
  }

  if (attachmentsResult.error) {
    throw attachmentsResult.error
  }

  const historyRecords = (historyResult.data ?? []) as ServiceOrderHistoryRecord[]
  const attachmentRecords = (attachmentsResult.data ??
    []) as ServiceOrderAttachmentRecord[]
  const historyProfileIds = Array.from(
    new Set(
      historyRecords
        .map((entry) => entry.changed_by_user_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const attachmentProfileIds = Array.from(
    new Set(
      attachmentRecords
        .map((entry) => entry.created_by_user_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const mergedProfileMap = new Map(profileMap)
  const [historyProfiles, attachmentProfiles] = await Promise.all([
    listProfilesByIds(historyProfileIds),
    listProfilesByIds(attachmentProfileIds),
  ])

  historyProfiles.forEach((value, key) => {
    mergedProfileMap.set(key, value)
  })
  attachmentProfiles.forEach((value, key) => {
    mergedProfileMap.set(key, value)
  })

  const itemRecords = (itemsResult.data ?? []) as ServiceOrderItemRecord[]
  const productIds = Array.from(
    new Set(
      itemRecords
        .map((item) => item.product_id)
        .filter((value): value is string => Boolean(value))
    )
  )
  const productMap = await listProductsByIds(storeId, productIds)

  return {
    id: serviceOrder.id,
    storeId: serviceOrder.store_id,
    customerId: serviceOrder.customer_id,
    createdByUserId: serviceOrder.created_by_user_id,
    createdByName:
      mergedProfileMap.get(serviceOrder.created_by_user_id)?.name ?? null,
    assignedToUserId: serviceOrder.assigned_to_user_id,
    assignedToName: serviceOrder.assigned_to_user_id
      ? mergedProfileMap.get(serviceOrder.assigned_to_user_id)?.name ?? null
      : null,
    orderNumber: serviceOrder.order_number,
    status: serviceOrder.status,
    deviceType: serviceOrder.device_type,
    brand: serviceOrder.brand,
    model: serviceOrder.model,
    imei: serviceOrder.imei,
    serialNumber: serviceOrder.serial_number,
    color: serviceOrder.color,
    accessories: serviceOrder.accessories,
    reportedIssue: serviceOrder.reported_issue,
    foundIssue: serviceOrder.found_issue,
    technicalNotes: serviceOrder.technical_notes,
    estimatedCompletionDate: serviceOrder.estimated_completion_date,
    totalEstimatedCents: parseDbMoneyToCents(serviceOrder.total_estimated),
    totalFinalCents: parseDbMoneyToCents(serviceOrder.total_final),
    approvedAt: serviceOrder.approved_at,
    deliveredAt: serviceOrder.delivered_at,
    createdAt: serviceOrder.created_at,
    updatedAt: serviceOrder.updated_at,
    customer: mapCustomer((customerResult.data as CustomerRecord | null) ?? null),
    items: itemRecords.map((record) => mapServiceOrderItem(record, productMap)),
    history: historyRecords.map((record) =>
      mapServiceOrderHistory(record, mergedProfileMap)
    ),
    attachments: attachmentRecords.map((record) =>
      mapServiceOrderAttachment(record, mergedProfileMap)
    ),
  }
}

export async function createServiceOrder(
  storeId: string,
  userId: string,
  input: ServiceOrderCreateMutationInput
) {
  await ensureCustomerInStore(storeId, input.customer_id)
  await ensureProfileInStore(storeId, input.assigned_to_user_id ?? null)

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("service_order_create", {
    p_store_id: storeId,
    p_user_id: userId,
    p_customer_id: input.customer_id,
    p_assigned_to_user_id: input.assigned_to_user_id ?? null,
    p_device_type: input.device_type,
    p_brand: input.brand ?? null,
    p_model: input.model ?? null,
    p_imei: input.imei ?? null,
    p_serial_number: input.serial_number ?? null,
    p_color: input.color ?? null,
    p_accessories: input.accessories ?? null,
    p_reported_issue: input.reported_issue,
  })

  if (error) {
    throw error
  }

  return getServiceOrderFullDetail(String(data), storeId)
}

export async function updateServiceOrder(
  serviceOrderId: string,
  storeId: string,
  input: ServiceOrderUpdateMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const existing = await getServiceOrderRecord(serviceOrderId, storeId)

  if (!existing) {
    return null
  }

  if (input.customer_id) {
    await ensureCustomerInStore(storeId, input.customer_id)
  }

  if (Object.prototype.hasOwnProperty.call(input, "assigned_to_user_id")) {
    await ensureProfileInStore(storeId, input.assigned_to_user_id ?? null)
  }

  const payload = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  )

  const { error } = await supabase
    .from("service_orders")
    .update(payload)
    .eq("store_id", storeId)
    .eq("id", serviceOrderId)

  if (error) {
    throw error
  }

  return getServiceOrderFullDetail(serviceOrderId, storeId)
}

export async function changeServiceOrderStatus(
  serviceOrderId: string,
  storeId: string,
  userId: string,
  input: ServiceOrderStatusChangeInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase.rpc("service_order_change_status", {
    p_store_id: storeId,
    p_user_id: userId,
    p_service_order_id: serviceOrderId,
    p_new_status: input.new_status,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw error
  }

  return getServiceOrderFullDetail(serviceOrderId, storeId)
}

export async function addServiceOrderItem(
  serviceOrderId: string,
  storeId: string,
  userId: string,
  input: ServiceOrderItemMutationInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { error } = await supabase.rpc("service_order_add_item", {
    p_store_id: storeId,
    p_user_id: userId,
    p_service_order_id: serviceOrderId,
    p_product_id: input.product_id,
    p_description: input.description ?? null,
    p_quantity: input.quantity,
    p_unit_price: input.unit_price,
  })

  if (error) {
    throw error
  }

  return getServiceOrderFullDetail(serviceOrderId, storeId)
}

export async function createServiceOrderAttachment(
  serviceOrderId: string,
  storeId: string,
  userId: string,
  input: {
    fileName: string
    filePath: string
    fileUrl: string
    mimeType: string
    sizeBytes: number
  }
) {
  const existing = await getServiceOrderRecord(serviceOrderId, storeId)

  if (!existing) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("service_order_attachments")
    .insert({
      service_order_id: serviceOrderId,
      created_by_user_id: userId,
      file_name: input.fileName,
      file_path: input.filePath,
      file_url: input.fileUrl,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select(
      "id, created_by_user_id, file_name, file_path, file_url, mime_type, size_bytes, created_at"
    )
    .single()

  if (error) {
    throw error
  }

  const profileMap = await listProfilesByIds([userId])

  return mapServiceOrderAttachment(
    data as ServiceOrderAttachmentRecord,
    profileMap
  )
}

export async function getServiceOrderReceiptData(
  serviceOrderId: string,
  storeId: string
): Promise<ServiceOrderReceiptData | null> {
  const supabase = await createClient({ serviceRole: true })
  const [serviceOrder, storeResult] = await Promise.all([
    getServiceOrderFullDetail(serviceOrderId, storeId),
    supabase
      .from("stores")
      .select("display_name, name")
      .eq("id", storeId)
      .maybeSingle(),
  ])

  if (storeResult.error) {
    throw storeResult.error
  }

  if (!serviceOrder) {
    return null
  }

  return {
    storeName: storeResult.data?.display_name ?? storeResult.data?.name ?? "ALPHA TECNOLOGIA",
    warrantyText: DEFAULT_SERVICE_ORDER_WARRANTY_TEXT,
    serviceOrder,
  }
}
