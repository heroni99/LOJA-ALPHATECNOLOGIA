import { ZodError } from "zod"

import type {
  CustomerDetail,
  CustomerReceivable,
  CustomerSale,
  CustomerServiceOrder,
  CustomerSummary,
} from "@/lib/customers"

export function getCustomerApiErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export function toCustomerSummaryDto(customer: CustomerSummary) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    cpf_cnpj: customer.cpfCnpj,
    city: customer.city,
    state: customer.state,
    active: customer.active,
  }
}

export function toCustomerSaleDto(sale: CustomerSale) {
  return {
    id: sale.id,
    sale_number: sale.saleNumber,
    status: sale.status,
    total: sale.totalCents,
    created_at: sale.createdAt,
    completed_at: sale.completedAt,
  }
}

export function toCustomerServiceOrderDto(serviceOrder: CustomerServiceOrder) {
  return {
    id: serviceOrder.id,
    order_number: serviceOrder.orderNumber,
    status: serviceOrder.status,
    device_type: serviceOrder.deviceType,
    brand: serviceOrder.brand,
    model: serviceOrder.model,
    total_final: serviceOrder.totalFinalCents,
    created_at: serviceOrder.createdAt,
  }
}

export function toCustomerReceivableDto(receivable: CustomerReceivable) {
  return {
    id: receivable.id,
    description: receivable.description,
    amount: receivable.amountCents,
    due_date: receivable.dueDate,
    status: receivable.status,
    received_at: receivable.receivedAt,
    sale_id: receivable.saleId,
    sale_number: receivable.saleNumber,
    service_order_id: receivable.serviceOrderId,
    service_order_number: receivable.serviceOrderNumber,
  }
}

export function toCustomerDetailDto(
  customer: CustomerDetail,
  extra?: {
    sales?: CustomerSale[]
    serviceOrders?: CustomerServiceOrder[]
    receivables?: CustomerReceivable[]
  }
) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    phone2: customer.phone2,
    email: customer.email,
    cpf_cnpj: customer.cpfCnpj,
    zip_code: customer.zipCode,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
    active: customer.active,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    sales: (extra?.sales ?? []).map(toCustomerSaleDto),
    service_orders: (extra?.serviceOrders ?? []).map(toCustomerServiceOrderDto),
    accounts_receivable: (extra?.receivables ?? []).map(toCustomerReceivableDto),
  }
}
