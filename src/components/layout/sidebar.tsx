"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  isNavigationItemActive,
  navigationGroups,
  type NavigationItem,
} from "@/components/layout/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type SidebarProps = {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  storeName: string
}

function SidebarBrand({
  storeName,
  isCollapsed,
}: {
  storeName: string
  isCollapsed: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#F97316] text-white shadow-lg shadow-[#F97316]/20">
        <Smartphone className="size-5" />
      </div>
      {!isCollapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {storeName}
          </p>
          <p className="text-xs text-[#9ca3af]">ERP / PDV</p>
        </div>
      ) : null}
    </div>
  )
}

function SidebarLink({
  item,
  isCollapsed,
  onNavigate,
}: {
  item: NavigationItem
  isCollapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = isNavigationItemActive(item, pathname)
  const Icon = item.icon

  const liveIndicator = item.liveIndicator ? (
    isCollapsed ? (
      <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-[#F97316]" />
      </span>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative inline-flex size-2.5 shrink-0 rounded-full bg-[#F97316]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-75" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.liveTooltip ?? "Atualiza automaticamente a cada minuto"}
        </TooltipContent>
      </Tooltip>
    )
  ) : null

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 items-center rounded-2xl transition-colors",
        isCollapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-[#F9731615] text-[#F97316]"
          : "text-[#9ca3af] hover:bg-white/5 hover:text-white"
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className="size-5 shrink-0" />
        {isCollapsed ? liveIndicator : null}
      </span>
      {!isCollapsed ? (
        <>
          <span className="truncate text-sm font-medium">{item.label}</span>
          {liveIndicator}
        </>
      ) : null}
    </Link>
  )

  if (!isCollapsed) {
    return link
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.liveIndicator ? (
          <div className="space-y-1">
            <p>{item.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {item.liveTooltip ?? "Atualiza automaticamente a cada minuto"}
            </p>
          </div>
        ) : (
          item.label
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarNavigation({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <TooltipProvider>
      <nav className="space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!isCollapsed ? (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                {group.title}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileOpenChange,
  storeName,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-white/5 bg-[#111827] transition-[width] duration-200 md:flex md:flex-col",
          isCollapsed ? "md:w-16" : "md:w-60"
        )}
      >
        <div
          className={cn(
            "border-b border-white/5",
            isCollapsed
              ? "flex flex-col items-center gap-3 px-2 py-3"
              : "flex h-16 items-center justify-between px-3"
          )}
        >
          <SidebarBrand storeName={storeName} isCollapsed={isCollapsed} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            className={cn(
              "shrink-0 rounded-2xl text-[#9ca3af] hover:bg-white/5 hover:text-white",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
            <span className="sr-only">
              {isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            </span>
          </Button>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto py-6",
            isCollapsed ? "px-2" : "px-3"
          )}
        >
          <SidebarNavigation isCollapsed={isCollapsed} />
        </div>
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[18rem] border-r-0 bg-[#111827] p-0 text-white sm:max-w-[18rem]"
        >
          <SheetHeader className="border-b border-white/5 px-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#F97316] text-white">
                <Smartphone className="size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="truncate text-left text-sm font-semibold text-white">
                  {storeName}
                </SheetTitle>
                <SheetDescription className="text-left text-[#9ca3af]">
                  Navegação principal do sistema
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-6">
            <SidebarNavigation
              isCollapsed={false}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
