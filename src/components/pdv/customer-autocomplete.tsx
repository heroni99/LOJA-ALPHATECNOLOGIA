"use client"

import { useEffect, useState } from "react"
import { Search, UserRound } from "lucide-react"

import type { PdvCustomerOption } from "@/lib/pdv"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CustomersApiResponse = {
  data?: {
    id: string
    name: string
    phone: string | null
    active: boolean
  }[]
}

type CustomerAutocompleteProps = {
  value: PdvCustomerOption | null
  onChange: (customer: PdvCustomerOption | null) => void
  placeholder?: string
}

export function CustomerAutocomplete({
  value,
  onChange,
  placeholder = "Cliente opcional",
}: CustomerAutocompleteProps) {
  const [search, setSearch] = useState(value?.name ?? "")
  const [results, setResults] = useState<PdvCustomerOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearch(value?.name ?? "")
  }, [value])

  useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/customers?search=${encodeURIComponent(query)}&active=true`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Não foi possível buscar clientes.")
          }

          const data = (await response.json()) as CustomersApiResponse

          return (data.data ?? []).map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
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
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [search])

  function handleSelect(customer: PdvCustomerOption) {
    setSearch(customer.name)
    setResults([])
    setIsOpen(false)
    onChange(customer)
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
        className="pl-9"
        placeholder={placeholder}
        onFocus={() => {
          if (results.length > 0) {
            setIsOpen(true)
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value
          setSearch(nextValue)

          if (!nextValue.trim()) {
            onChange(null)
          } else if (value) {
            onChange(null)
          }

          setIsOpen(true)
        }}
      />

      {value ? (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          <UserRound className="size-3" />
          {value.name}
        </div>
      ) : null}

      {isOpen && (isLoading || results.length > 0 || search.trim().length >= 2) ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Buscando clientes...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1.5">
              {results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(customer)
                  }}
                >
                  <span className="font-medium text-foreground">
                    {customer.name}
                  </span>
                  <span className="text-muted-foreground">
                    {customer.phone ?? "Telefone não informado"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
