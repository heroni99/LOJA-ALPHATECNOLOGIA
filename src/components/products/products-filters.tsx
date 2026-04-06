"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

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

type ProductsFiltersProps = {
  categories: ProductFormOption[]
  currentSearch: string
  currentCategoryId: string | null
  currentActive: boolean | null
}

export function ProductsFilters({
  categories,
  currentSearch,
  currentCategoryId,
  currentActive,
}: ProductsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "all")
  const [active, setActive] = useState(
    currentActive === null ? "all" : String(currentActive)
  )

  useEffect(() => {
    setSearch(currentSearch)
    setCategoryId(currentCategoryId ?? "all")
    setActive(currentActive === null ? "all" : String(currentActive))
  }, [currentActive, currentCategoryId, currentSearch])

  function pushFilters(nextValues?: {
    search?: string
    categoryId?: string
    active?: string
  }) {
    const params = new URLSearchParams()
    const nextSearch = (nextValues?.search ?? search).trim()
    const nextCategoryId = nextValues?.categoryId ?? categoryId
    const nextActive = nextValues?.active ?? active

    if (nextSearch) {
      params.set("search", nextSearch)
    }

    if (nextCategoryId !== "all") {
      params.set("category_id", nextCategoryId)
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
    setCategoryId("all")
    setActive("all")

    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_180px_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, código, marca ou modelo"
          className="pl-9"
        />
      </div>
      <Select
        value={categoryId}
        onValueChange={(value) => {
          setCategoryId(value)
        }}
      >
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
      <Select
        value={active}
        onValueChange={(value) => {
          setActive(value)
        }}
      >
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
