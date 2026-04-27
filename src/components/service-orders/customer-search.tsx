"use client"

import Link from "next/link"
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { Loader2, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type CustomerSearchOption = {
  id: string
  name: string
  phone: string | null
  cpfCnpj: string | null
}

type CustomersApiItem = {
  id: string
  name: string
  phone: string | null
  cpf_cnpj: string | null
}

type CustomersApiResponse = {
  data?: CustomersApiItem[] | { customers?: CustomersApiItem[] }
  customers?: CustomersApiItem[]
} | CustomersApiItem[]

type CustomerSearchProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  "value" | "onChange"
> & {
  value: CustomerSearchOption | null
  onChange: (customer: CustomerSearchOption | null) => void
  placeholder?: string
}

function mapCustomerOption(customer: CustomersApiItem): CustomerSearchOption {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    cpfCnpj: customer.cpf_cnpj,
  }
}

function getCustomersFromResponse(data: CustomersApiResponse) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data.customers)) {
    return data.customers
  }

  if (Array.isArray(data.data)) {
    return data.data
  }

  if (data.data && typeof data.data === "object" && Array.isArray(data.data.customers)) {
    return data.data.customers
  }

  return []
}

export const CustomerSearch = forwardRef<HTMLInputElement, CustomerSearchProps>(
  function CustomerSearch(
    {
      value,
      onChange,
      placeholder = "Buscar cliente por nome ou telefone",
      className,
      onBlur,
      onFocus,
      ...inputProps
    },
    ref
  ) {
  const [search, setSearch] = useState(value?.name ?? "")
  const [results, setResults] = useState<CustomerSearchOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchOption | null>(
    value
  )

  useEffect(() => {
    if (value) {
      setSelectedCustomer(value)
      setSearch(value.name)
      return
    }

    setSelectedCustomer(null)
  }, [value])

  useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      setResults([])
      setIsLoading(false)
      setShowDropdown(false)
      return
    }

    if (selectedCustomer && query === selectedCustomer.name.trim()) {
      setResults([])
      setIsLoading(false)
      setShowDropdown(false)

      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setShowDropdown(true)

    const timeoutId = window.setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Não foi possível buscar clientes.")
          }

          const data = (await response.json()) as CustomersApiResponse

          return getCustomersFromResponse(data).map(mapCustomerOption)
        })
        .then((items) => {
          setResults(items)
          setShowDropdown(true)
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }

          setResults([])
          setShowDropdown(true)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [search, selectedCustomer])

  function handleSelect(customer: CustomerSearchOption) {
    setSelectedCustomer(customer)
    setSearch(customer.name)
    setResults([])
    setIsLoading(false)
    setShowDropdown(false)
    onChange(customer)
  }

  return (
    <div
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...inputProps}
        ref={ref}
        value={search}
        autoComplete="off"
        className={cn("pl-9", className)}
        placeholder={placeholder}
        onFocus={(event) => {
          if (!selectedCustomer && search.trim().length >= 2) {
            setShowDropdown(true)
          }

          onFocus?.(event)
        }}
        onChange={(event) => {
          const nextValue = event.target.value
          const trimmedValue = nextValue.trim()
          const selectedName = selectedCustomer?.name ?? value?.name ?? ""

          setSearch(nextValue)

          if (!trimmedValue) {
            setSelectedCustomer(null)
            setResults([])
            setIsLoading(false)
            setShowDropdown(false)

            if (selectedCustomer || value) {
              onChange(null)
            }

            return
          }

          if (selectedName && nextValue !== selectedName) {
            setSelectedCustomer(null)

            if (selectedCustomer || value) {
              onChange(null)
            }
          }

          if (trimmedValue.length >= 2) {
            setShowDropdown(true)
            return
          }

          setResults([])
          setIsLoading(false)
          setShowDropdown(false)
        }}
        onBlur={(event) => {
          window.setTimeout(() => setShowDropdown(false), 120)
          onBlur?.(event)
        }}
      />

      {showDropdown && !selectedCustomer && search.trim().length >= 2 ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
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
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{customer.phone ?? "Telefone não informado"}</span>
                    <span>{customer.cpfCnpj ?? "CPF/CNPJ não informado"}</span>
                  </div>
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
)

CustomerSearch.displayName = "CustomerSearch"
