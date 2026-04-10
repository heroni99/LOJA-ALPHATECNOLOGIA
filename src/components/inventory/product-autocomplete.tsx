"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { Search } from "lucide-react"

import type { InventoryProductOption } from "@/lib/inventory"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ProductsApiResponse = {
  data?: {
    id: string
    internal_code: string
    name: string
  }[]
}

type ProductAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onProductSelect?: (product: InventoryProductOption | null) => void
  initialProduct?: InventoryProductOption | null
  placeholder?: string
}

function getProductLabel(product: InventoryProductOption) {
  return `${product.internalCode} - ${product.name}`
}

export function ProductAutocomplete({
  value,
  onChange,
  onProductSelect,
  initialProduct = null,
  placeholder = "Buscar produto por nome ou código",
}: ProductAutocompleteProps) {
  const [search, setSearch] = useState(
    initialProduct ? getProductLabel(initialProduct) : ""
  )
  const [results, setResults] = useState<InventoryProductOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductOption | null>(
    initialProduct
  )
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    if (initialProduct && value === initialProduct.id) {
      setSelectedProduct(initialProduct)
      setSearch(getProductLabel(initialProduct))
      return
    }

    if (!value && selectedProduct) {
      setSelectedProduct(null)
      setSearch("")
      setResults([])
    }
  }, [initialProduct, selectedProduct, value])

  useEffect(() => {
    const query = deferredSearch.trim()

    if (query.length < 2 || (selectedProduct && query === getProductLabel(selectedProduct))) {
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetch(
      `/api/products/search?q=${encodeURIComponent(query)}&active=true&is_service=false`,
      {
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível buscar os produtos.")
        }

        const data = (await response.json()) as ProductsApiResponse

        return (data.data ?? []).map((product) => ({
          id: product.id,
          internalCode: product.internal_code,
          name: product.name,
        }))
      })
      .then((items) => {
        setResults(items)
        setIsOpen(true)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setResults([])
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [deferredSearch, selectedProduct])

  function handleSelect(product: InventoryProductOption) {
    setSelectedProduct(product)
    setSearch(getProductLabel(product))
    setResults([])
    setIsOpen(false)
    onChange(product.id)
    onProductSelect?.(product)
  }

  return (
    <div
      className="relative"
      onBlur={() => {
        window.setTimeout(() => setIsOpen(false), 120)
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        placeholder={placeholder}
        className="pl-9"
        onFocus={() => {
          if (results.length > 0) {
            setIsOpen(true)
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value

          setSearch(nextValue)
          setIsOpen(true)

          if (selectedProduct || value) {
            setSelectedProduct(null)
            onProductSelect?.(null)
            onChange("")
          }
        }}
      />
      {value ? (
        <p className="mt-2 text-xs text-muted-foreground">Produto selecionado.</p>
      ) : null}
      {isOpen && (isLoading || results.length > 0 || deferredSearch.trim().length >= 2) ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Buscando produtos...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1.5">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(product)
                  }}
                >
                  <span className="font-medium text-foreground">
                    {product.internalCode}
                  </span>
                  <span className="text-muted-foreground">{product.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
