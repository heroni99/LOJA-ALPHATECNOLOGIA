"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"

import type { InventoryLocationOption, InventoryProductOption } from "@/lib/inventory"
import { getInventoryMovementTypeOptions } from "@/lib/inventory"
import { ProductAutocomplete } from "@/components/inventory/product-autocomplete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type InventoryMovementsFiltersProps = {
  locations: InventoryLocationOption[]
  currentProductId: string | null
  currentMovementType: string | null
  currentLocationId: string | null
  currentDateStart: string | null
  currentDateEnd: string | null
  initialProduct: InventoryProductOption | null
}

export function InventoryMovementsFilters({
  locations,
  currentProductId,
  currentMovementType,
  currentLocationId,
  currentDateStart,
  currentDateEnd,
  initialProduct,
}: InventoryMovementsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [productId, setProductId] = useState(currentProductId ?? "")
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductOption | null>(
    initialProduct
  )
  const [movementType, setMovementType] = useState(currentMovementType ?? "all")
  const [locationId, setLocationId] = useState(currentLocationId ?? "all")
  const [dateStart, setDateStart] = useState(currentDateStart ?? "")
  const [dateEnd, setDateEnd] = useState(currentDateEnd ?? "")

  useEffect(() => {
    setProductId(currentProductId ?? "")
    setSelectedProduct(initialProduct)
    setMovementType(currentMovementType ?? "all")
    setLocationId(currentLocationId ?? "all")
    setDateStart(currentDateStart ?? "")
    setDateEnd(currentDateEnd ?? "")
  }, [
    currentDateEnd,
    currentDateStart,
    currentLocationId,
    currentMovementType,
    currentProductId,
    initialProduct,
  ])

  function pushFilters() {
    const params = new URLSearchParams()

    if (productId) {
      params.set("product_id", productId)
    }

    if (locationId !== "all") {
      params.set("location_id", locationId)
    }

    if (movementType !== "all") {
      params.set("type", movementType)
    }

    if (dateStart) {
      params.set("date_start", dateStart)
    }

    if (dateEnd) {
      params.set("date_end", dateEnd)
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  function handleClear() {
    setProductId("")
    setSelectedProduct(null)
    setMovementType("all")
    setLocationId("all")
    setDateStart("")
    setDateEnd("")

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
      className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_180px_180px_auto]"
    >
      <ProductAutocomplete
        value={productId}
        onChange={setProductId}
        onProductSelect={setSelectedProduct}
        initialProduct={selectedProduct}
        placeholder="Filtrar por produto"
      />

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

      <Select value={movementType} onValueChange={setMovementType}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {getInventoryMovementTypeOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
      <Input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />

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
