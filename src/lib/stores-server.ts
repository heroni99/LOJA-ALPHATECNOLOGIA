import "server-only"

import { createClient } from "@/lib/supabase/server"
import { DEFAULT_STORE_TIMEZONE } from "@/lib/store-time"

type StoreRecord = {
  id: string
  display_name: string | null
  name: string | null
  timezone: string | null
}

export type StoreSnapshot = {
  id: string
  displayName: string
  timezone: string
}

export async function getStoreSnapshot(storeId: string): Promise<StoreSnapshot> {
  const supabase = await createClient({ serviceRole: true })
  const { data, error } = await supabase
    .from("stores")
    .select("id, display_name, name, timezone")
    .eq("id", storeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const store = (data as StoreRecord | null) ?? null

  return {
    id: storeId,
    displayName: store?.display_name ?? store?.name ?? "ALPHA TECNOLOGIA",
    timezone: store?.timezone ?? DEFAULT_STORE_TIMEZONE,
  }
}
