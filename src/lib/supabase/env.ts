const PLACEHOLDER_PREFIX = "sua_"

function isPlaceholder(value: string | undefined) {
  const normalized = value?.trim() ?? ""

  return normalized.length === 0 || normalized.startsWith(PLACEHOLDER_PREFIX)
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  return Boolean(
    url &&
      anonKey &&
      !isPlaceholder(url) &&
      !isPlaceholder(anonKey) &&
      url.startsWith("http")
  )
}

export function isSupabaseServiceRoleConfigured() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  return Boolean(serviceRoleKey && !isPlaceholder(serviceRoleKey))
}
