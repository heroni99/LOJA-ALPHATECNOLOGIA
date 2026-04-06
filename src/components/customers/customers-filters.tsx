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

type CustomersFiltersProps = {
  currentSearch: string
  currentActive: boolean | null
}

export function CustomersFilters({
  currentSearch,
  currentActive,
}: CustomersFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [active, setActive] = useState(
    currentActive === null ? "all" : String(currentActive)
  )

  useEffect(() => {
    setSearch(currentSearch)
    setActive(currentActive === null ? "all" : String(currentActive))
  }, [currentActive, currentSearch])

  function pushFilters(nextValues?: {
    search?: string
    active?: string
  }) {
    const params = new URLSearchParams()
    const nextSearch = (nextValues?.search ?? search).trim()
    const nextActive = nextValues?.active ?? active

    if (nextSearch) {
      params.set("search", nextSearch)
    }

    if (nextActive !== "all") {
      params.set("active", nextActive)
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    pushFilters()
  }

  function handleClear() {
    setSearch("")
    setActive("all")

    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, telefone ou CPF/CNPJ"
          className="pl-9"
        />
      </div>
      <Select value={active} onValueChange={setActive}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Ativos</SelectItem>
          <SelectItem value="false">Inativos</SelectItem>
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
          onClick={handleClear}
        >
          <X />
          Limpar
        </Button>
      </div>
    </form>
  )
}
