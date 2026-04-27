import { ZodError, z } from "zod"

export const SETTINGS_PRIMARY_COLOR_FALLBACK = "#F97316"

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/
const CODE_REGEX = /^[A-Za-z0-9_-]+$/
const PREFIX_REGEX = /^[A-Za-z0-9_-]+$/

export type StoreSettings = {
  id: string
  code: string
  name: string
  displayName: string | null
  primaryColor: string
  logoUrl: string | null
}

export type StoreRoleOption = {
  id: string
  name: string
}

export type StoreUserSummary = {
  id: string
  name: string
  email: string | null
  roleId: string
  roleName: string | null
  active: boolean
}

export type StoreCategorySummary = {
  id: string
  name: string
  prefix: string
  defaultSerialized: boolean
  active: boolean
}

export const storeSettingsFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da loja.").max(160),
  displayName: z.string().trim().max(160),
  code: z
    .string()
    .trim()
    .min(1, "Informe o código da loja.")
    .max(64)
    .regex(CODE_REGEX, "Use apenas letras, números, hífen ou underscore."),
  primaryColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, "Informe uma cor hexadecimal válida."),
  logoUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//i.test(value), {
      message: "A URL da logo é inválida.",
    }),
})

export type StoreSettingsFormValues = z.infer<typeof storeSettingsFormSchema>

export const storeSettingsMutationSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da loja.").max(160),
  displayName: z.string().trim().max(160).nullable().optional(),
  code: z
    .string()
    .trim()
    .min(1, "Informe o código da loja.")
    .max(64)
    .regex(CODE_REGEX, "Use apenas letras, números, hífen ou underscore."),
  primaryColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, "Informe uma cor hexadecimal válida."),
  logoUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//i.test(value), {
      message: "A URL da logo é inválida.",
    })
    .nullable()
    .optional(),
})

export type StoreSettingsMutationInput = z.infer<typeof storeSettingsMutationSchema>

export const defaultStoreSettingsFormValues: StoreSettingsFormValues = {
  name: "",
  displayName: "",
  code: "",
  primaryColor: SETTINGS_PRIMARY_COLOR_FALLBACK,
  logoUrl: "",
}

export const storeUserUpdateSchema = z.object({
  roleId: z.string().uuid("Selecione um perfil de acesso."),
  active: z.boolean(),
})

export type StoreUserUpdateInput = z.infer<typeof storeUserUpdateSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(120),
  prefix: z
    .string()
    .trim()
    .min(1, "Informe o prefixo da categoria.")
    .max(24)
    .regex(PREFIX_REGEX, "Use apenas letras, números, hífen ou underscore."),
  defaultSerialized: z.boolean(),
})

export type StoreCategoryFormValues = z.infer<typeof categoryFormSchema>

export const storeCategoryCreateSchema = categoryFormSchema.extend({
  active: z.boolean().default(true),
})

export const storeCategoryUpdateSchema = z
  .object({
    name: categoryFormSchema.shape.name.optional(),
    prefix: categoryFormSchema.shape.prefix.optional(),
    defaultSerialized: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar a categoria.",
  })

export type StoreCategoryCreateInput = z.infer<typeof storeCategoryCreateSchema>
export type StoreCategoryUpdateInput = z.infer<typeof storeCategoryUpdateSchema>

export const defaultStoreCategoryFormValues: StoreCategoryFormValues = {
  name: "",
  prefix: "",
  defaultSerialized: false,
}

export function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length > 0 ? normalized : null
}

export function normalizePrimaryColor(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? ""

  return HEX_COLOR_REGEX.test(normalized)
    ? normalized
    : SETTINGS_PRIMARY_COLOR_FALLBACK
}

export function toStoreSettingsFormValues(
  store: StoreSettings
): StoreSettingsFormValues {
  return {
    name: store.name,
    displayName: store.displayName ?? "",
    code: store.code,
    primaryColor: normalizePrimaryColor(store.primaryColor),
    logoUrl: store.logoUrl ?? "",
  }
}

export function toStoreSettingsMutationInput(
  values: StoreSettingsFormValues
): StoreSettingsMutationInput {
  const parsed = storeSettingsMutationSchema.parse(values)

  return {
    name: parsed.name.trim(),
    displayName: normalizeOptionalString(parsed.displayName),
    code: parsed.code.trim().toUpperCase(),
    primaryColor: normalizePrimaryColor(parsed.primaryColor),
    logoUrl: normalizeOptionalString(parsed.logoUrl),
  }
}

export function toStoreCategoryFormValues(
  category: StoreCategorySummary
): StoreCategoryFormValues {
  return {
    name: category.name,
    prefix: category.prefix,
    defaultSerialized: category.defaultSerialized,
  }
}

export function toStoreCategoryCreateInput(
  values: StoreCategoryFormValues
): StoreCategoryCreateInput {
  const parsed = storeCategoryCreateSchema.parse({
    ...values,
    active: true,
  })

  return {
    name: parsed.name.trim(),
    prefix: parsed.prefix.trim().toUpperCase(),
    defaultSerialized: parsed.defaultSerialized,
    active: parsed.active,
  }
}

export function toStoreCategoryUpdateInput(
  values: Partial<StoreCategoryFormValues> & { active?: boolean }
): StoreCategoryUpdateInput {
  const parsed = storeCategoryUpdateSchema.parse(values)

  return {
    name: parsed.name?.trim(),
    prefix: parsed.prefix?.trim().toUpperCase(),
    defaultSerialized: parsed.defaultSerialized,
    active: parsed.active,
  }
}

export function getSettingsErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    const message = error.message.trim()

    if (!message) {
      return "Não foi possível processar a solicitação."
    }

    if (/stores_code_key/i.test(message)) {
      return "Já existe outra loja com este código."
    }

    if (/categories_store_id_name_key/i.test(message)) {
      return "Já existe uma categoria com este nome."
    }

    if (/categories_store_id_prefix_key/i.test(message)) {
      return "Já existe uma categoria com este prefixo."
    }

    if (/profiles_role_id_fkey|foreign key/i.test(message)) {
      return "Perfil de acesso inválido."
    }

    return message
  }

  return "Não foi possível processar a solicitação."
}

export function getSettingsErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : ""

  if (error instanceof ZodError) {
    return 400
  }

  if (/não encontrado/i.test(message)) {
    return 404
  }

  if (
    /stores_code_key|categories_store_id_name_key|categories_store_id_prefix_key/i.test(
      message
    )
  ) {
    return 409
  }

  if (
    /inválid|invalido|inativa|inativo|não pode|nao pode|perfil|categoria|loja/i.test(
      message
    )
  ) {
    return 400
  }

  return 500
}
