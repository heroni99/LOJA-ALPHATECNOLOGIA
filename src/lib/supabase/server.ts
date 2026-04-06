import { createServerClient, type CookieOptions } from "@supabase/ssr"
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js"
import { cookies } from "next/headers"

import {
  isSupabaseConfigured,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/env"

type CreateClientOptions = {
  serviceRole?: boolean
}

type AppSupabaseClient = SupabaseClient

export async function createClient(
  options: CreateClientOptions = {}
): Promise<AppSupabaseClient> {
  if (options.serviceRole) {
    if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
      throw new Error("Supabase service role is not configured.")
    }

    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", maxAge: 0, ...options })
          } catch {}
        },
      },
    }
  )
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user ?? null
  } catch {
    return null
  }
}
