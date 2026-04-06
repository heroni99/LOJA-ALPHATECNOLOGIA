import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient, getCurrentUser } from "@/lib/supabase/server"

function getDefaultUserName(user: User) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null

  if (metadataName) {
    return metadataName
  }

  if (user.email) {
    return user.email.split("@")[0]
  }

  return "Usuário"
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  let storeName = "ALPHA TECNOLOGIA"
  let userName = getDefaultUserName(user)
  let roleName: string | null = null

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, store_id, role_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.name) {
      userName = profile.name
    }

    if (profile?.store_id) {
      const { data: store } = await supabase
        .from("stores")
        .select("display_name, name")
        .eq("id", profile.store_id)
        .maybeSingle()

      if (store?.display_name || store?.name) {
        storeName = store.display_name ?? store.name
      }
    }

    if (profile?.role_id) {
      const { data: role } = await supabase
        .from("roles")
        .select("name")
        .eq("id", profile.role_id)
        .maybeSingle()

      roleName = role?.name ?? null
    }
  } catch {}

  return (
    <DashboardShell
      storeName={storeName}
      userName={userName}
      roleName={roleName}
      userEmail={user.email ?? null}
    >
      {children}
    </DashboardShell>
  )
}
