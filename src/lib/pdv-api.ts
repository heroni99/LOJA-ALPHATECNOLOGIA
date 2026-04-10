import { ZodError } from "zod"

import type {
  PdvCategorySummary,
  PdvCompletedSale,
  PdvCompletedSaleItem,
  PdvCompletedSalePayment,
  PdvSearchResult,
} from "@/lib/pdv"

export type PdvSearchResultDto = {
  id: string
  product_unit_id: string | null
  name: string
  internal_code: string
  sale_price: number
  has_serial_control: boolean
  stock_total: number
  image_url: string | null
  category: {
    id: string | null
    name: string
  } | null
  imei_or_serial: string | null
}

export type PdvCompletedSaleItemDto = {
  id: string
  product_id: string
  product_unit_id: string | null
  name: string
  internal_code: string
  imei_or_serial: string | null
  quantity: number
  unit_price: number
  discount_amount: number
  total_price: number
}

export type PdvCompletedSalePaymentDto = {
  id: string
  method: PdvCompletedSalePayment["method"]
  amount: number
  installments: number
}

export type PdvCompletedSaleDto = {
  sale_id: string
  sale_number: string
  customer_name: string | null
  subtotal: number
  discount_amount: number
  total: number
  change_amount: number
  completed_at: string | null
  items: PdvCompletedSaleItemDto[]
  payments: PdvCompletedSalePaymentDto[]
}

export function getPdvApiErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a operação do PDV."
}

export function toPdvSearchResultDto(result: PdvSearchResult): PdvSearchResultDto {
  return {
    id: result.productId,
    product_unit_id: result.productUnitId,
    name: result.name,
    internal_code: result.internalCode,
    sale_price: result.salePriceCents,
    has_serial_control: result.hasSerialControl,
    stock_total: result.availableQuantity,
    image_url: result.imageUrl,
    category: toPdvCategoryDto(result.category),
    imei_or_serial: result.imeiOrSerial,
  }
}

export function fromPdvSearchResultDto(result: PdvSearchResultDto): PdvSearchResult {
  const isUnit = Boolean(result.product_unit_id)

  return {
    key: isUnit ? `unit:${result.product_unit_id}` : `product:${result.id}`,
    kind: isUnit ? "unit" : "product",
    productId: result.id,
    productUnitId: result.product_unit_id,
    internalCode: result.internal_code,
    name: result.name,
    salePriceCents: result.sale_price,
    hasSerialControl: result.has_serial_control,
    availableQuantity: result.stock_total,
    imageUrl: result.image_url,
    category: result.category,
    imeiOrSerial: result.imei_or_serial,
  }
}

export function toPdvCompletedSaleDto(sale: PdvCompletedSale): PdvCompletedSaleDto {
  return {
    sale_id: sale.id,
    sale_number: sale.saleNumber,
    customer_name: sale.customerName,
    subtotal: sale.subtotalCents,
    discount_amount: sale.discountAmountCents,
    total: sale.totalCents,
    change_amount: sale.changeCents,
    completed_at: sale.completedAt,
    items: sale.items.map(toPdvCompletedSaleItemDto),
    payments: sale.payments.map(toPdvCompletedSalePaymentDto),
  }
}

export function fromPdvCompletedSaleDto(sale: PdvCompletedSaleDto): PdvCompletedSale {
  return {
    id: sale.sale_id,
    saleNumber: sale.sale_number,
    customerName: sale.customer_name,
    subtotalCents: sale.subtotal,
    discountAmountCents: sale.discount_amount,
    totalCents: sale.total,
    changeCents: sale.change_amount,
    completedAt: sale.completed_at,
    items: sale.items.map(fromPdvCompletedSaleItemDto),
    payments: sale.payments.map(fromPdvCompletedSalePaymentDto),
  }
}

function toPdvCompletedSaleItemDto(item: PdvCompletedSaleItem): PdvCompletedSaleItemDto {
  return {
    id: item.id,
    product_id: item.productId,
    product_unit_id: item.productUnitId,
    name: item.name,
    internal_code: item.internalCode,
    imei_or_serial: item.imeiOrSerial,
    quantity: item.quantity,
    unit_price: item.unitPriceCents,
    discount_amount: item.discountAmountCents,
    total_price: item.totalPriceCents,
  }
}

function fromPdvCompletedSaleItemDto(item: PdvCompletedSaleItemDto): PdvCompletedSaleItem {
  return {
    id: item.id,
    productId: item.product_id,
    productUnitId: item.product_unit_id,
    name: item.name,
    internalCode: item.internal_code,
    imeiOrSerial: item.imei_or_serial,
    quantity: item.quantity,
    unitPriceCents: item.unit_price,
    discountAmountCents: item.discount_amount,
    totalPriceCents: item.total_price,
  }
}

function toPdvCompletedSalePaymentDto(
  payment: PdvCompletedSalePayment
): PdvCompletedSalePaymentDto {
  return {
    id: payment.id,
    method: payment.method,
    amount: payment.amountCents,
    installments: payment.installments,
  }
}

function fromPdvCompletedSalePaymentDto(
  payment: PdvCompletedSalePaymentDto
): PdvCompletedSalePayment {
  return {
    id: payment.id,
    method: payment.method,
    amountCents: payment.amount,
    installments: payment.installments,
  }
}

function toPdvCategoryDto(category: PdvCategorySummary | null) {
  if (!category) {
    return null
  }

  return {
    id: category.id,
    name: category.name,
  }
}
