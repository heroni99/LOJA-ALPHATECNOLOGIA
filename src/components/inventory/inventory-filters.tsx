"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"

import type { InventoryLocationOption } from "@/lib/inventory"
import type { ProductFormOption } from "@/lib/products"
import { Button } from "@/components/ui/button"
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
  currentLocationId: string | null
  currentCategoryId: string | null
  currentBelowMin: boolean
}

export function InventoryFilters({
  locations,
  categories,
  currentLocationId,
  currentCategoryId,
  currentBelowMin,
}: InventoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [locationId, setLocationId] = useState(currentLocationId ?? "all")
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "all")
  const [belowMin, setBelowMin] = useState(currentBelowMin ? "true" : "all")

  useEffect(() => {
    setLocationId(currentLocationId ?? "all")
    setCategoryId(currentCategoryId ?? "all")
    setBelowMin(currentBelowMin ? "true" : "all")
  }, [currentBelowMin, currentCategoryId, currentLocationId])

  function pushFilters(nextValues?: {
    locationId?: string
    categoryId?: string
    belowMin?: string
  }) {
    const params = new URLSearchParams()
    const nextLocationId = nextValues?.locationId ?? locationId
    const nextCategoryId = nextValues?.categoryId ?? categoryId
    const nextBelowMin = nextValues?.belowMin ?? belowMin

    if (nextLocationId !== "all") {
      params.set("location_id", nextLocationId)
    }

    if (nextCategoryId !== "all") {
      params.set("category_id", nextCategoryId)
    }

    if (nextBelowMin === "true") {
      params.set("below_min", "true")
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
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

      <Select value={belowMin} onValueChange={setBelowMin}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Estoque mínimo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os saldos</SelectItem>
          <SelectItem value="true">Abaixo do mínimo</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button
          disabled={isPending}
          onClick={() => pushFilters()}
        >
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setLocationId("all")
            setCategoryId("all")
            setBelowMin("all")

            startTransition(() => {
              router.push(pathname)
            })
          }}
        >
          <X />
          Limpar
        </Button>
      </div>
    </div>
  )
}
