import { z } from "zod"

export const SUPPLIERS_PAGE_SIZE = 20

type SearchParamsLike = Record<string, string | string[] | undefined>

export const supplierMutationSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor."),
  trade_name: z.string().trim().max(180).nullable().optional(),
  cnpj: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  contact_name: z.string().trim().max(160).nullable().optional(),
  zip_code: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().default(true),
})

export type SupplierMutationInput = z.infer<typeof supplierMutationSchema>

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor."),
  trade_name: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact_name: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>

export type SupplierSummary = {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  city: string | null
  active: boolean
}

export type SupplierDetail = {
  id: string
  name: string
  tradeName: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  contactName: string | null
  zipCode: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierProduct = {
  id: string
  internalCode: string
  name: string
  salePriceCents: number
  active: boolean
}

export type SupplierPurchaseOrder = {
  id: string
  orderNumber: string
  status: string
  totalCents: number
  orderedAt: string | null
  createdAt: string
}

export type SupplierPayable = {
  id: string
  description: string
  amountCents: number
  dueDate: string
  status: string
  paidAt: string | null
  purchaseOrderId: string | null
  purchaseOrderNumber: string | null
}

export type SupplierListFilters = {
  search: string
  active: boolean | null
  page: number
  limit: number
}

export const defaultSupplierFormValues: SupplierFormValues = {
  name: "",
  trade_name: "",
  cnpj: "",
  email: "",
  phone: "",
  contact_name: "",
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

export function getSupplierListFilters(
  searchParams: SearchParamsLike
): SupplierListFilters {
  const getValue = (key: string) => {
    const rawValue = searchParams[key]

    return Array.isArray(rawValue) ? rawValue[0] : rawValue
  }

  const page = Number.parseInt(getValue("page") ?? "1", 10)
  const limit = Number.parseInt(getValue("limit") ?? String(SUPPLIERS_PAGE_SIZE), 10)

  return {
    search: (getValue("search") ?? "").trim(),
    active: parseBooleanFilter(getValue("active")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit:
      Number.isFinite(limit) && limit > 0
        ? Math.min(Math.max(limit, 1), 100)
        : SUPPLIERS_PAGE_SIZE,
  }
}

export function toSupplierMutationInput(
  values: SupplierFormValues
): SupplierMutationInput {
  const parsed = supplierFormSchema.parse(values)

  return {
    name: parsed.name.trim(),
    trade_name: normalizeOptionalString(parsed.trade_name),
    cnpj: normalizeOptionalString(parsed.cnpj),
    email: normalizeOptionalString(parsed.email),
    phone: normalizeOptionalString(parsed.phone),
    contact_name: normalizeOptionalString(parsed.contact_name),
    zip_code: normalizeOptionalString(parsed.zip_code),
    address: normalizeOptionalString(parsed.address),
    city: normalizeOptionalString(parsed.city),
    state: normalizeOptionalString(parsed.state),
    notes: normalizeOptionalString(parsed.notes),
    active: parsed.active,
  }
}

export function toSupplierFormValues(
  supplier: Pick<
    SupplierDetail,
    | "name"
    | "tradeName"
    | "cnpj"
    | "email"
    | "phone"
    | "contactName"
    | "zipCode"
    | "address"
    | "city"
    | "state"
    | "notes"
    | "active"
  >
): SupplierFormValues {
  return {
    name: supplier.name,
    trade_name: supplier.tradeName ?? "",
    cnpj: supplier.cnpj ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    contact_name: supplier.contactName ?? "",
    zip_code: supplier.zipCode ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    state: supplier.state ?? "",
    notes: supplier.notes ?? "",
    active: supplier.active,
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}
