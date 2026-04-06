"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type PurchaseOrderStatus,
  getPurchaseOrderStatusOptions,
} from "@/lib/purchase-orders"

type PurchaseOrdersFiltersProps = {
  currentSearch: string
  currentStatus: PurchaseOrderStatus | null
}

export function PurchaseOrdersFilters({
  currentSearch,
  currentStatus,
}: PurchaseOrdersFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [status, setStatus] = useState(currentStatus ?? "all")

  useEffect(() => {
    setSearch(currentSearch)
    setStatus(currentStatus ?? "all")
  }, [currentSearch, currentStatus])

  function pushFilters(nextValues?: { search?: string; status?: string }) {
    const params = new URLSearchParams()
    const nextSearch = (nextValues?.search ?? search).trim()
    const nextStatus = nextValues?.status ?? status

    if (nextSearch) {
      params.set("search", nextSearch)
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus)
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        pushFilters()
      }}
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          className="pl-9"
          placeholder="Buscar por número do pedido ou fornecedor"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {getPurchaseOrderStatusOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button type="submit" disabled={isPending}>
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setSearch("")
            setStatus("all")
            startTransition(() => router.push(pathname))
          }}
        >
          <X />
          Limpar
        </Button>
      </div>
    </form>
  )
}
