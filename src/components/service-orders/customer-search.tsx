"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2, Search, UserRound, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type CustomerSearchOption = {
  id: string
  name: string
  phone: string | null
  cpfCnpj: string | null
}

type CustomersApiResponse = {
  data?: {
    id: string
    name: string
    phone: string | null
    cpf_cnpj: string | null
  }[]
}

type CustomerSearchProps = {
  value: CustomerSearchOption | null
  onChange: (customer: CustomerSearchOption | null) => void
  placeholder?: string
}

export function CustomerSearch({
  value,
  onChange,
  placeholder = "Buscar cliente por nome ou telefone",
}: CustomerSearchProps) {
  const [search, setSearch] = useState(value?.name ?? "")
  const [results, setResults] = useState<CustomerSearchOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearch(value?.name ?? "")
  }, [value])

  useEffect(() => {
    const query = search.trim()

    if (value || query.length < 2) {
      setResults([])
      setIsLoading(false)

      if (query.length < 2) {
        setIsOpen(false)
      }

      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/customers?search=${encodeURIComponent(query)}`, {
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
            cpfCnpj: customer.cpf_cnpj,
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
          setIsOpen(true)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [search, value])

  function handleSelect(customer: CustomerSearchOption) {
    setSearch(customer.name)
    setResults([])
    setIsOpen(false)
    onChange(customer)
  }

  function handleClear() {
    setSearch("")
    setResults([])
    setIsOpen(false)
    onChange(null)
  }

  if (value) {
    return (
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UserRound className="size-4 text-muted-foreground" />
              <span className="truncate">{value.name}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {value.phone ?? "Telefone não informado"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-orange-300 hover:text-orange-600"
            aria-label="Limpar cliente selecionado"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
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
          if (search.trim().length >= 2) {
            setIsOpen(true)
          }
        }}
        onChange={(event) => {
          setSearch(event.target.value)
          setIsOpen(true)
        }}
      />

      {isOpen && search.trim().length >= 2 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
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
            <div className="space-y-2 px-4 py-3 text-sm text-muted-foreground">
              <div>Nenhum cliente encontrado.</div>
              <Link
                href="/customers/new"
                className="inline-flex text-sm font-medium text-orange-600 transition-colors hover:text-orange-700 hover:underline"
              >
                Cadastrar novo cliente
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
