import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  PDV_SEARCH_RESULT_LIMIT,
  type PdvCheckoutInput,
  type PdvCompletedSale,
  type PdvCompletedSaleItem,
  type PdvCompletedSalePayment,
  type PdvCustomerOption,
  type PdvPaymentMethod,
  type PdvSearchResult,
} from "@/lib/pdv"
import { parseDbMoneyToCents } from "@/lib/products"

type StockLocationRecord = {
  id: string
  name: string
}

type ProductRecord = {
  id: string
  name: string
  internal_code: string
  sale_price: number | string | null
  has_serial_control: boolean
  active: boolean
  is_service: boolean
}

type ProductCodeRecord = {
  product_id: string
  product_unit_id: string | null
  code: string
  scope: string
  code_type: string
}

type StockBalanceRecord = {
  product_id: string
  quantity: number | string | null
}

type ProductUnitRecord = {
  id: string
  product_id: string
  imei: string | null
  imei2: string | null
  serial_number: string | null
  current_location_id: string | null
  unit_status: string
  purchase_price: number | string | null
}

type SaleRecord = {
  id: string
  store_id: string
  customer_id: string | null
  user_id: string
  sale_number: string
  subtotal: number | string | null
  discount_amount: number | string | null
  total: number | string | null
  completed_at: string | null
  created_at: string
}

type SaleItemRecord = {
  id: string
  product_id: string
  product_unit_id: string | null
  quantity: number | string | null
  unit_price: number | string | null
  total_price: number | string | null
}

type SalePaymentRecord = {
  id: string
  method: PdvPaymentMethod
  amount: number | string | null
  installments: number
}

type StoreRecord = {
  id: string
  name: string
  display_name: string | null
}

type ProfileRecord = {
  id: string
  name: string | null
}

type SaleReceiptData = {
  sale: PdvCompletedSale
  storeName: string
  operatorName: string | null
  customer: PdvCustomerOption | null
}

type SalesCheckoutRpcResponse = {
  sale_id: string
  sale_number: string
  subtotal: number
  discount_amount: number
  total: number
  change_amount: number
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  )
}

function parseQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

async function getDefaultStockLocation(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("active", true)
    .eq("is_default", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as StockLocationRecord | null) ?? null
}

async function getProductsByIds(storeId: string, productIds: string[]) {
  if (productIds.length === 0) {
    return []
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, sale_price, has_serial_control, active, is_service")
    .eq("store_id", storeId)
    .eq("active", true)
    .eq("is_service", false)
    .in("id", productIds)

  if (error) {
    throw error
  }

  return (data ?? []) as ProductRecord[]
}

function getResultSearchScore(result: PdvSearchResult, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const candidates = [
    result.internalCode,
    result.name,
    result.imeiOrSerial ?? "",
  ].map((candidate) => candidate.toLowerCase())

  if (candidates.some((candidate) => candidate === normalizedQuery)) {
    return 0
  }

  if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) {
    return 1
  }

  return 2
}

function mapSaleItemSummary(
  item: SaleItemRecord,
  productMap: Map<string, ProductRecord>,
  unitMap: Map<string, ProductUnitRecord>
): PdvCompletedSaleItem {
  const product = productMap.get(item.product_id)
  const unit = item.product_unit_id ? unitMap.get(item.product_unit_id) : null
  const imeiOrSerial = unit?.imei ?? unit?.serial_number ?? unit?.imei2 ?? null

  return {
    id: item.id,
    productId: item.product_id,
    productUnitId: item.product_unit_id,
    name: product?.name ?? "Produto",
    internalCode: product?.internal_code ?? "N/A",
    imeiOrSerial,
    quantity: parseQuantity(item.quantity),
    unitPriceCents: parseDbMoneyToCents(item.unit_price),
    totalPriceCents: parseDbMoneyToCents(item.total_price),
  }
}

async function getSaleById(saleId: string, storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, store_id, customer_id, user_id, sale_number, subtotal, discount_amount, total, completed_at, created_at"
    )
    .eq("store_id", storeId)
    .eq("id", saleId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as SaleRecord | null) ?? null
}

async function getSaleItems(saleId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sale_items")
    .select("id, product_id, product_unit_id, quantity, unit_price, total_price")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as SaleItemRecord[]
}

async function getSalePayments(saleId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("sale_payments")
    .select("id, method, amount, installments")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as SalePaymentRecord[]
}

async function getCustomerById(customerId: string | null) {
  if (!customerId) {
    return null
  }

  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", customerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
  } satisfies PdvCustomerOption
}

async function getStoreById(storeId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, display_name")
    .eq("id", storeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as StoreRecord | null) ?? null
}

async function getProfileById(profileId: string) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProfileRecord | null) ?? null
}

export async function searchPdvCatalog(storeId: string, rawQuery: string) {
  const query = rawQuery.trim()

  if (!query) {
    return [] satisfies PdvSearchResult[]
  }

  const defaultLocation = await getDefaultStockLocation(storeId)

  if (!defaultLocation) {
    throw new Error("Configure um local de estoque padrão antes de usar o PDV.")
  }

  const sanitized = query.replace(/[(),]/g, " ").trim()
  const supabase = await createClient({ serviceRole: true })
  const [productQueryResult, codeQueryResult, unitQueryResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, internal_code, sale_price, has_serial_control, active, is_service")
      .eq("store_id", storeId)
      .eq("active", true)
      .eq("is_service", false)
      .or(`name.ilike.%${sanitized}%,internal_code.ilike.%${sanitized}%`)
      .limit(20),
    supabase
      .from("product_codes")
      .select("product_id, product_unit_id, code, scope, code_type")
      .ilike("code", `%${sanitized}%`)
      .limit(20),
    supabase
      .from("product_units")
      .select(
        "id, product_id, imei, imei2, serial_number, current_location_id, unit_status, purchase_price"
      )
      .eq("current_location_id", defaultLocation.id)
      .eq("unit_status", "IN_STOCK")
      .or(
        `imei.ilike.%${sanitized}%,imei2.ilike.%${sanitized}%,serial_number.ilike.%${sanitized}%`
      )
      .limit(20),
  ])

  if (productQueryResult.error) {
    throw productQueryResult.error
  }

  if (codeQueryResult.error) {
    throw codeQueryResult.error
  }

  if (unitQueryResult.error) {
    throw unitQueryResult.error
  }

  const codeRows = (codeQueryResult.data ?? []) as ProductCodeRecord[]
  const exactUnitRows = (unitQueryResult.data ?? []) as ProductUnitRecord[]
  const matchingProductIds = dedupeStrings([
    ...((productQueryResult.data ?? []) as ProductRecord[]).map((product) => product.id),
    ...codeRows.map((code) => code.product_id),
    ...exactUnitRows.map((unit) => unit.product_id),
  ])
  const matchingProducts = await getProductsByIds(storeId, matchingProductIds)
  const productMap = new Map(matchingProducts.map((product) => [product.id, product]))
  const codedUnitIds = dedupeStrings(
    codeRows
      .filter((code) => code.scope === "UNIT" && code.product_unit_id)
      .map((code) => code.product_unit_id)
  )
  const serializedProductIds = matchingProducts
    .filter((product) => product.has_serial_control)
    .map((product) => product.id)
  const nonSerializedProductIds = matchingProducts
    .filter((product) => !product.has_serial_control)
    .map((product) => product.id)

  const [stockBalancesResult, serializedUnitsByProductResult, codedUnitResult] =
    await Promise.all([
      nonSerializedProductIds.length > 0
        ? supabase
            .from("stock_balances")
            .select("product_id, quantity")
            .eq("location_id", defaultLocation.id)
            .in("product_id", nonSerializedProductIds)
        : Promise.resolve({ data: [], error: null }),
      serializedProductIds.length > 0
        ? supabase
            .from("product_units")
            .select(
              "id, product_id, imei, imei2, serial_number, current_location_id, unit_status, purchase_price"
            )
            .eq("current_location_id", defaultLocation.id)
            .eq("unit_status", "IN_STOCK")
            .in("product_id", serializedProductIds)
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
      codedUnitIds.length > 0
        ? supabase
            .from("product_units")
            .select(
              "id, product_id, imei, imei2, serial_number, current_location_id, unit_status, purchase_price"
            )
            .eq("current_location_id", defaultLocation.id)
            .eq("unit_status", "IN_STOCK")
            .in("id", codedUnitIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (stockBalancesResult.error) {
    throw stockBalancesResult.error
  }

  if (serializedUnitsByProductResult.error) {
    throw serializedUnitsByProductResult.error
  }

  if (codedUnitResult.error) {
    throw codedUnitResult.error
  }

  const stockBalanceMap = new Map(
    ((stockBalancesResult.data ?? []) as StockBalanceRecord[]).map((balance) => [
      balance.product_id,
      parseQuantity(balance.quantity),
    ])
  )
  const serializedUnits = [
    ...(exactUnitRows ?? []),
    ...((serializedUnitsByProductResult.data ?? []) as ProductUnitRecord[]),
    ...((codedUnitResult.data ?? []) as ProductUnitRecord[]),
  ]
  const serializedUnitMap = new Map(serializedUnits.map((unit) => [unit.id, unit]))

  const productResults = matchingProducts
    .filter((product) => !product.has_serial_control)
    .map((product) => ({
      key: `product:${product.id}`,
      kind: "product" as const,
      productId: product.id,
      productUnitId: null,
      internalCode: product.internal_code,
      name: product.name,
      salePriceCents: parseDbMoneyToCents(product.sale_price),
      hasSerialControl: false,
      availableQuantity: stockBalanceMap.get(product.id) ?? 0,
      imeiOrSerial: null,
    }))
    .filter((product) => product.availableQuantity > 0)

  const unitResults: PdvSearchResult[] = Array.from(serializedUnitMap.values()).flatMap(
    (unit) => {
      const product = productMap.get(unit.product_id)

      if (!product || !product.has_serial_control) {
        return []
      }

      return [
        {
          key: `unit:${unit.id}`,
          kind: "unit" as const,
          productId: product.id,
          productUnitId: unit.id,
          internalCode: product.internal_code,
          name: product.name,
          salePriceCents: parseDbMoneyToCents(product.sale_price),
          hasSerialControl: true,
          availableQuantity: 1,
          imeiOrSerial: unit.imei ?? unit.serial_number ?? unit.imei2 ?? null,
        },
      ]
    }
  )

  return [...unitResults, ...productResults]
    .sort((left, right) => {
      const scoreDiff =
        getResultSearchScore(left, query) - getResultSearchScore(right, query)

      if (scoreDiff !== 0) {
        return scoreDiff
      }

      if (left.kind !== right.kind) {
        return left.kind === "unit" ? -1 : 1
      }

      return left.name.localeCompare(right.name, "pt-BR")
    })
    .slice(0, PDV_SEARCH_RESULT_LIMIT)
}

export async function checkoutPdvSale(
  storeId: string,
  userId: string,
  payload: PdvCheckoutInput
) {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase.rpc("sales_checkout", {
    p_store_id: storeId,
    p_user_id: userId,
    p_cash_session_id: payload.cash_session_id,
    p_customer_id: payload.customer_id ?? null,
    p_discount_mode: payload.discount?.mode ?? null,
    p_discount_value: payload.discount?.value ?? 0,
    p_items: payload.items,
    p_payments: payload.payments,
  })

  if (error) {
    throw error
  }

  const response = data as SalesCheckoutRpcResponse | null

  if (!response?.sale_id) {
    throw new Error("Não foi possível concluir a venda.")
  }

  const sale = await getSaleCheckoutSummary(
    response.sale_id,
    storeId,
    parseDbMoneyToCents(response.change_amount)
  )

  if (!sale) {
    throw new Error("Venda concluída, mas os dados não puderam ser carregados.")
  }

  return sale
}

export async function getSaleCheckoutSummary(
  saleId: string,
  storeId: string,
  changeCents = 0
): Promise<PdvCompletedSale | null> {
  const sale = await getSaleById(saleId, storeId)

  if (!sale) {
    return null
  }

  const [items, payments, customer] = await Promise.all([
    getSaleItems(sale.id),
    getSalePayments(sale.id),
    getCustomerById(sale.customer_id),
  ])
  const productIds = dedupeStrings(items.map((item) => item.product_id))
  const unitIds = dedupeStrings(items.map((item) => item.product_unit_id))
  const [products, units] = await Promise.all([
    getProductsByIds(storeId, productIds),
    unitIds.length > 0
      ? createClient({ serviceRole: true }).then(async (supabase) => {
          const { data, error } = await supabase
            .from("product_units")
            .select(
              "id, product_id, imei, imei2, serial_number, current_location_id, unit_status, purchase_price"
            )
            .in("id", unitIds)

          if (error) {
            throw error
          }

          return (data ?? []) as ProductUnitRecord[]
        })
      : Promise.resolve([] as ProductUnitRecord[]),
  ])

  const productMap = new Map(products.map((product) => [product.id, product]))
  const unitMap = new Map(units.map((unit) => [unit.id, unit]))

  return {
    id: sale.id,
    saleNumber: sale.sale_number,
    customerName: customer?.name ?? null,
    subtotalCents: parseDbMoneyToCents(sale.subtotal),
    discountAmountCents: parseDbMoneyToCents(sale.discount_amount),
    totalCents: parseDbMoneyToCents(sale.total),
    changeCents,
    completedAt: sale.completed_at ?? sale.created_at,
    items: items.map((item) => mapSaleItemSummary(item, productMap, unitMap)),
    payments: payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amountCents: parseDbMoneyToCents(payment.amount),
      installments: payment.installments,
    })) satisfies PdvCompletedSalePayment[],
  }
}

export async function getSaleReceiptData(
  saleId: string,
  storeId: string
): Promise<SaleReceiptData | null> {
  const sale = await getSaleCheckoutSummary(saleId, storeId)

  if (!sale) {
    return null
  }

  const saleRecord = await getSaleById(saleId, storeId)

  if (!saleRecord) {
    return null
  }

  const [store, operator, customer] = await Promise.all([
    getStoreById(saleRecord.store_id),
    getProfileById(saleRecord.user_id),
    getCustomerById(saleRecord.customer_id),
  ])

  return {
    sale,
    storeName: store?.display_name ?? store?.name ?? "ALPHA TECNOLOGIA",
    operatorName: operator?.name ?? null,
    customer,
  }
}
