"use client"

import { useEffect, useState } from "react"

import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "alpha-tecnologia.sidebar-collapsed"

type DashboardShellProps = {
  children: React.ReactNode
  storeName: string
  userName: string
  roleName: string | null
  userEmail: string | null
}

export function DashboardShell({
  children,
  storeName,
  userName,
  roleName,
  userEmail,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean | null>(
    null
  )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setIsSidebarCollapsed(storedValue === "true")
  }, [])

  useEffect(() => {
    if (isSidebarCollapsed === null) {
      return
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(isSidebarCollapsed)
    )
  }, [isSidebarCollapsed])

  const sidebarCollapsed = isSidebarCollapsed ?? false

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() =>
          setIsSidebarCollapsed((current) => !(current ?? false))
        }
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
        storeName={storeName}
      />

      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-200",
          sidebarCollapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        <Topbar
          storeName={storeName}
          userName={userName}
          roleName={roleName}
          userEmail={userEmail}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
