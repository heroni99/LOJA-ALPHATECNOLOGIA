import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  StoreCategoryCreateInput,
  StoreCategorySummary,
  StoreCategoryUpdateInput,
  StoreRoleOption,
  StoreSettings,
  StoreSettingsMutationInput,
  StoreUserSummary,
  StoreUserUpdateInput,
} from "@/lib/settings"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type SettingsProfileRecord = {
  id: string
  store_id: string | null
  active: boolean
}

type StoreRecord = {
  id: string
  code: string
  name: string
  display_name: string | null
  primary_color: string | null
  logo_url: string | null
}

type RoleRecord = {
  id: string
  name: string
  active?: boolean | null
}

type RoleRelation =
  | { id: string; name: string | null }
  | { id: string; name: string | null }[]

type ProfileRecord = {
  id: string
  name: string
  role_id: string
  active: boolean
  roles?: RoleRelation | null
}

type CategoryRecord = {
  id: string
  name: string
  prefix: string
  default_serialized: boolean
  active: boolean
}

export type SettingsContext = {
  supabase: ServerSupabaseClient
  userId: string
  userEmail: string | null
  storeId: string
  profileActive: boolean
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function mapStore(record: StoreRecord): StoreSettings {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    displayName: record.display_name,
    primaryColor: record.primary_color ?? "#F97316",
    logoUrl: record.logo_url,
  }
}

function mapRole(record: RoleRecord): StoreRoleOption {
  return {
    id: record.id,
    name: record.name,
  }
}

function mapCategory(record: CategoryRecord): StoreCategorySummary {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    defaultSerialized: record.default_serialized,
    active: record.active,
  }
}

function mapUser(record: ProfileRecord, email: string | null): StoreUserSummary {
  const role = getSingleRelation(record.roles)

  return {
    id: record.id,
    name: record.name,
    email,
    roleId: record.role_id,
    roleName: role?.name ?? null,
    active: record.active,
  }
}

async function getEmailByUserId(
  userId: string
): Promise<string | null> {
  try {
    const supabaseAdmin = await createClient({ serviceRole: true })
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error) {
      return null
    }

    return data.user?.email ?? null
  } catch {
    return null
  }
}

async function listUserEmails(userIds: string[]) {
  const emailEntries = await Promise.all(
    userIds.map(async (userId) => [userId, await getEmailByUserId(userId)] as const)
  )

  return new Map(emailEntries)
}

export async function getSettingsContext(): Promise<SettingsContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, store_id, active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  const resolvedProfile = (profile as SettingsProfileRecord | null) ?? null

  if (!resolvedProfile?.store_id) {
    return null
  }

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    storeId: resolvedProfile.store_id,
    profileActive: resolvedProfile.active,
  }
}

export async function getStoreSettings(
  context: SettingsContext
): Promise<StoreSettings | null> {
  const { data, error } = await context.supabase
    .from("stores")
    .select("id, code, name, display_name, primary_color, logo_url")
    .eq("id", context.storeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const store = (data as StoreRecord | null) ?? null

  return store ? mapStore(store) : null
}

export async function updateStoreSettings(
  context: SettingsContext,
  input: StoreSettingsMutationInput
): Promise<StoreSettings | null> {
  const { data, error } = await context.supabase
    .from("stores")
    .update({
      name: input.name,
      display_name: input.displayName,
      code: input.code,
      primary_color: input.primaryColor,
      logo_url: input.logoUrl,
    })
    .eq("id", context.storeId)
    .select("id, code, name, display_name, primary_color, logo_url")
    .maybeSingle()

  if (error) {
    throw error
  }

  const store = (data as StoreRecord | null) ?? null

  return store ? mapStore(store) : null
}

export async function listStoreRoles(
  context: SettingsContext
): Promise<StoreRoleOption[]> {
  const { data, error } = await context.supabase
    .from("roles")
    .select("id, name, active")
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as RoleRecord[]).map(mapRole)
}

export async function listStoreUsers(
  context: SettingsContext
): Promise<StoreUserSummary[]> {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id, name, role_id, active, roles(id, name)")
    .eq("store_id", context.storeId)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  const profiles = (data ?? []) as ProfileRecord[]
  const emailMap = await listUserEmails(profiles.map((profile) => profile.id))

  return profiles.map((profile) => {
    const email =
      profile.id === context.userId
        ? context.userEmail ?? emailMap.get(profile.id) ?? null
        : emailMap.get(profile.id) ?? null

    return mapUser(profile, email)
  })
}

async function ensureRoleExists(
  context: SettingsContext,
  roleId: string
) {
  const { data, error } = await context.supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("active", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("Perfil de acesso inválido.")
  }
}

export async function updateStoreUser(
  context: SettingsContext,
  userId: string,
  input: StoreUserUpdateInput
): Promise<StoreUserSummary | null> {
  if (userId === context.userId && input.active === false) {
    throw new Error("Você não pode desativar o próprio usuário logado.")
  }

  await ensureRoleExists(context, input.roleId)

  const { data, error } = await context.supabase
    .from("profiles")
    .update({
      role_id: input.roleId,
      active: input.active,
    })
    .eq("store_id", context.storeId)
    .eq("id", userId)
    .select("id, name, role_id, active, roles(id, name)")
    .maybeSingle()

  if (error) {
    throw error
  }

  const profile = (data as ProfileRecord | null) ?? null

  if (!profile) {
    return null
  }

  const email =
    profile.id === context.userId
      ? context.userEmail ?? (await getEmailByUserId(profile.id))
      : await getEmailByUserId(profile.id)

  return mapUser(profile, email)
}

export async function listStoreCategories(
  context: SettingsContext
): Promise<StoreCategorySummary[]> {
  const { data, error } = await context.supabase
    .from("categories")
    .select("id, name, prefix, default_serialized, active")
    .eq("store_id", context.storeId)
    .order("active", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as CategoryRecord[]).map(mapCategory)
}

export async function createStoreCategory(
  context: SettingsContext,
  input: StoreCategoryCreateInput
): Promise<StoreCategorySummary | null> {
  const { data, error } = await context.supabase
    .from("categories")
    .insert({
      store_id: context.storeId,
      name: input.name,
      prefix: input.prefix,
      default_serialized: input.defaultSerialized,
      active: input.active,
    })
    .select("id, name, prefix, default_serialized, active")
    .maybeSingle()

  if (error) {
    throw error
  }

  const category = (data as CategoryRecord | null) ?? null

  return category ? mapCategory(category) : null
}

export async function updateStoreCategory(
  context: SettingsContext,
  categoryId: string,
  input: StoreCategoryUpdateInput
): Promise<StoreCategorySummary | null> {
  const payload: Record<string, unknown> = {}

  if (typeof input.name === "string") {
    payload.name = input.name
  }

  if (typeof input.prefix === "string") {
    payload.prefix = input.prefix
  }

  if (typeof input.defaultSerialized === "boolean") {
    payload.default_serialized = input.defaultSerialized
  }

  if (typeof input.active === "boolean") {
    payload.active = input.active
  }

  const { data, error } = await context.supabase
    .from("categories")
    .update(payload)
    .eq("store_id", context.storeId)
    .eq("id", categoryId)
    .select("id, name, prefix, default_serialized, active")
    .maybeSingle()

  if (error) {
    throw error
  }

  const category = (data as CategoryRecord | null) ?? null

  return category ? mapCategory(category) : null
}
