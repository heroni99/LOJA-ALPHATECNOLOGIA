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

type StockReportFiltersProps = {
  currentSearch: string
  currentCategoryId: string | null
  currentLocationId: string | null
  currentLowStock: boolean
  categories: Array<{ id: string; name: string }>
  locations: Array<{ id: string; name: string }>
}

export function StockReportFilters({
  currentSearch,
  currentCategoryId,
  currentLocationId,
  currentLowStock,
  categories,
  locations,
}: StockReportFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "all")
  const [locationId, setLocationId] = useState(currentLocationId ?? "all")
  const [lowStock, setLowStock] = useState(currentLowStock ? "true" : "all")

  useEffect(() => {
    setSearch(currentSearch)
    setCategoryId(currentCategoryId ?? "all")
    setLocationId(currentLocationId ?? "all")
    setLowStock(currentLowStock ? "true" : "all")
  }, [currentSearch, currentCategoryId, currentLocationId, currentLowStock])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams()

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (categoryId !== "all") {
          params.set("category_id", categoryId)
        }

        if (locationId !== "all") {
          params.set("location_id", locationId)
        }

        if (lowStock === "true") {
          params.set("low_stock", "true")
        }

        startTransition(() => {
          router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
        })
      }}
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          className="pl-9"
          placeholder="Buscar por nome ou código"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={locationId} onValueChange={setLocationId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Local" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os locais</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={lowStock} onValueChange={setLowStock}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Abaixo do mínimo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os saldos</SelectItem>
          <SelectItem value="true">Abaixo do mínimo</SelectItem>
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
            setCategoryId("all")
            setLocationId("all")
            setLowStock("all")
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
