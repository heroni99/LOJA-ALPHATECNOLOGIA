"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import type { InventoryLocationOption } from "@/lib/inventory"
import type { ProductFormOption } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type InventoryFiltersProps = {
  locations: InventoryLocationOption[]
  categories: ProductFormOption[]
  currentSearch: string
  currentLocationId: string | null
  currentCategoryId: string | null
  currentLowStock: boolean
}

export function InventoryFilters({
  locations,
  categories,
  currentSearch,
  currentLocationId,
  currentCategoryId,
  currentLowStock,
}: InventoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [locationId, setLocationId] = useState(currentLocationId ?? "all")
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "all")
  const [lowStock, setLowStock] = useState(currentLowStock)

  useEffect(() => {
    setSearch(currentSearch)
    setLocationId(currentLocationId ?? "all")
    setCategoryId(currentCategoryId ?? "all")
    setLowStock(currentLowStock)
  }, [currentCategoryId, currentLocationId, currentLowStock, currentSearch])

  function pushFilters() {
    const params = new URLSearchParams()

    if (search.trim()) {
      params.set("search", search.trim())
    }

    if (locationId !== "all") {
      params.set("location_id", locationId)
    }

    if (categoryId !== "all") {
      params.set("category_id", categoryId)
    }

    if (lowStock) {
      params.set("low_stock", "true")
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  function handleClear() {
    setSearch("")
    setLocationId("all")
    setCategoryId("all")
    setLowStock(false)

    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        pushFilters()
      }}
      className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou código interno"
          className="pl-9"
        />
      </div>

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

      <Button
        type="button"
        variant={lowStock ? "default" : "outline"}
        disabled={isPending}
        onClick={() => setLowStock((currentValue) => !currentValue)}
      >
        {lowStock ? "Abaixo do mínimo" : "Todos os saldos"}
      </Button>

      <div className="flex flex-wrap gap-2 xl:justify-end">
        <Button type="submit" disabled={isPending}>
          Filtrar
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={handleClear}>
          <X />
          Limpar
        </Button>
      </div>
    </form>
  )
}
