import { ZodError } from "zod"

import type {
  SupplierDetail,
  SupplierPayable,
  SupplierProduct,
  SupplierPurchaseOrder,
  SupplierSummary,
} from "@/lib/suppliers"

export function getSupplierApiErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export function toSupplierSummaryDto(supplier: SupplierSummary) {
  return {
    id: supplier.id,
    name: supplier.name,
    cnpj: supplier.cnpj,
    phone: supplier.phone,
    city: supplier.city,
    active: supplier.active,
  }
}

export function toSupplierProductDto(product: SupplierProduct) {
  return {
    id: product.id,
    internal_code: product.internalCode,
    name: product.name,
    sale_price: product.salePriceCents,
    active: product.active,
  }
}

export function toSupplierPurchaseOrderDto(order: SupplierPurchaseOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    total: order.totalCents,
    ordered_at: order.orderedAt,
    created_at: order.createdAt,
  }
}

export function toSupplierPayableDto(payable: SupplierPayable) {
  return {
    id: payable.id,
    description: payable.description,
    amount: payable.amountCents,
    due_date: payable.dueDate,
    status: payable.status,
    paid_at: payable.paidAt,
    purchase_order_id: payable.purchaseOrderId,
    purchase_order_number: payable.purchaseOrderNumber,
  }
}

export function toSupplierDetailDto(
  supplier: SupplierDetail,
  extra?: {
    products?: SupplierProduct[]
    purchaseOrders?: SupplierPurchaseOrder[]
    payables?: SupplierPayable[]
  }
) {
  return {
    id: supplier.id,
    name: supplier.name,
    trade_name: supplier.tradeName,
    cnpj: supplier.cnpj,
    email: supplier.email,
    phone: supplier.phone,
    contact_name: supplier.contactName,
    zip_code: supplier.zipCode,
    address: supplier.address,
    city: supplier.city,
    state: supplier.state,
    notes: supplier.notes,
    active: supplier.active,
    created_at: supplier.createdAt,
    updated_at: supplier.updatedAt,
    products: (extra?.products ?? []).map(toSupplierProductDto),
    purchase_orders: (extra?.purchaseOrders ?? []).map(toSupplierPurchaseOrderDto),
    accounts_payable: (extra?.payables ?? []).map(toSupplierPayableDto),
  }
}
