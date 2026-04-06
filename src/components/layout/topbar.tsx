"use client"

import { useTransition } from "react"
import { LogOut, Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { getNavigationItem } from "@/components/layout/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "AT"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

type TopbarProps = {
  storeName: string
  userName: string
  roleName: string | null
  userEmail: string | null
  onOpenMobileSidebar: () => void
}

export function Topbar({
  storeName,
  userName,
  roleName,
  userEmail,
  onOpenMobileSidebar,
}: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const currentItem = getNavigationItem(pathname)

  async function handleLogout() {
    if (!isSupabaseConfigured()) {
      router.replace("/login")
      router.refresh()
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error("Não foi possível encerrar a sessão.")
      return
    }

    toast.success("Sessão encerrada com sucesso.")

    startTransition(() => {
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[#e5e7eb] bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onOpenMobileSidebar}
            className="rounded-2xl md:hidden"
          >
            <Menu className="size-4" />
            <span className="sr-only">Abrir navegação</span>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {storeName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {currentItem?.label ?? "Área interna"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-border bg-background px-3 py-2">
            <Avatar size="sm">
              <AvatarImage alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {userName}
              </p>
              <p className="truncate text-xs text-muted-foreground sm:hidden">
                {roleName ?? "Acesso interno"}
              </p>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="truncate text-xs text-muted-foreground">
                  {userEmail ?? "Usuário autenticado"}
                </span>
                <Badge variant="outline" className="border-primary/20 text-primary">
                  {roleName ?? "Acesso interno"}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleLogout()}
            disabled={isPending}
            className="gap-2 rounded-2xl"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">
              {isPending ? "Saindo..." : "Sair"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}
