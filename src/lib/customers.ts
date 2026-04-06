import { z } from "zod"

export const CUSTOMERS_PAGE_SIZE = 10

type SearchParamsLike = Record<string, string | string[] | undefined>

export const customerMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente."),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone do cliente."),
  email: z.string().trim().max(160).nullable().optional(),
  cpf_cnpj: z.string().trim().max(32).nullable().optional(),
  zip_code: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().default(true),
})

export type CustomerMutationInput = z.infer<typeof customerMutationSchema>

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente."),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone do cliente."),
  email: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export type CustomerSummary = {
  id: string
  name: string
  phone: string | null
  cpfCnpj: string | null
  city: string | null
  active: boolean
}

export type CustomerDetail = {
  id: string
  name: string
  phone: string | null
  email: string | null
  cpfCnpj: string | null
  zipCode: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerSale = {
  id: string
  saleNumber: string
  status: string
  totalCents: number
  createdAt: string
  completedAt: string | null
}

export type CustomerServiceOrder = {
  id: string
  orderNumber: string
  status: string
  deviceType: string
  brand: string | null
  model: string | null
  totalFinalCents: number
  createdAt: string
}

export type CustomerReceivable = {
  id: string
  description: string
  amountCents: number
  dueDate: string
  status: string
  receivedAt: string | null
  saleId: string | null
  serviceOrderId: string | null
}

export type CustomerListFilters = {
  search: string
  active: boolean | null
  page: number
}

export const defaultCustomerFormValues: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  cpf_cnpj: "",
  zip_code: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  active: true,
}

export function parseBooleanFilter(value: string | null | undefined) {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return null
}

export function getCustomerListFilters(
  searchParams: SearchParamsLike
): CustomerListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)

  return {
    search: (getValue("search") ?? "").trim(),
    active: parseBooleanFilter(getValue("active")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toCustomerMutationInput(
  values: CustomerFormValues
): CustomerMutationInput {
  const parsed = customerFormSchema.parse(values)

  return {
    name: parsed.name.trim(),
    phone: parsed.phone.trim(),
    email: normalizeOptionalString(parsed.email),
    cpf_cnpj: normalizeOptionalString(parsed.cpf_cnpj),
    zip_code: normalizeOptionalString(parsed.zip_code),
    address: normalizeOptionalString(parsed.address),
    city: normalizeOptionalString(parsed.city),
    state: normalizeOptionalString(parsed.state),
    notes: normalizeOptionalString(parsed.notes),
    active: parsed.active,
  }
}

export function toCustomerFormValues(
  customer: Pick<
    CustomerDetail,
    | "name"
    | "phone"
    | "email"
    | "cpfCnpj"
    | "zipCode"
    | "address"
    | "city"
    | "state"
    | "notes"
    | "active"
  >
): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    cpf_cnpj: customer.cpfCnpj ?? "",
    zip_code: customer.zipCode ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    notes: customer.notes ?? "",
    active: customer.active,
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
