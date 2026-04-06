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
import { type SaleStatus, getSaleStatusOptions } from "@/lib/sales"

type SalesFiltersProps = {
  currentSearch: string
  currentStatus: SaleStatus | null
}

export function SalesFilters({
  currentSearch,
  currentStatus,
}: SalesFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [status, setStatus] = useState(currentStatus ?? "all")

  useEffect(() => {
    setSearch(currentSearch)
    setStatus(currentStatus ?? "all")
  }, [currentSearch, currentStatus])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams()

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (status !== "all") {
          params.set("status", status)
        }

        startTransition(() => {
          router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
        })
      }}
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          className="pl-9"
          placeholder="Buscar por número da venda ou cliente"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {getSaleStatusOptions().map((option) => (
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
