import "server-only"

import { createClient } from "@/lib/supabase/server"

type ProfileStoreRecord = {
  store_id: string | null
}

export type RouteStoreContext = {
  userId: string
  storeId: string
}

export class RouteStoreContextError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "RouteStoreContextError"
    this.status = status
  }
}

export async function getRouteStoreContext(): Promise<RouteStoreContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    throw new RouteStoreContextError(401, "Unauthorized")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  const storeProfile = (profile as ProfileStoreRecord | null) ?? null

  if (!storeProfile) {
    throw new RouteStoreContextError(404, "Profile not found")
  }

  if (!storeProfile.store_id) {
    throw new RouteStoreContextError(400, "Profile without store_id")
  }

  return {
    userId: user.id,
    storeId: storeProfile.store_id,
  }
}

export function getRouteErrorStatus(error: unknown) {
  if (error instanceof RouteStoreContextError) {
    return error.status
  }

  return 500
}

export function getRouteErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Internal Server Error"
}

export function getRouteErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    value: error,
  }
}
