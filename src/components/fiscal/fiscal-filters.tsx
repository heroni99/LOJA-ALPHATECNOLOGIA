"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFiscalStatusOptions, type FiscalStatus } from "@/lib/fiscal"

type FiscalFiltersProps = {
  currentStart: string
  currentEnd: string
  currentStatus: FiscalStatus | null
}

export function FiscalFilters({
  currentStart,
  currentEnd,
  currentStatus,
}: FiscalFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState(currentStart)
  const [endDate, setEndDate] = useState(currentEnd)
  const [status, setStatus] = useState(currentStatus ?? "all")

  useEffect(() => {
    setStartDate(currentStart)
    setEndDate(currentEnd)
    setStatus(currentStatus ?? "all")
  }, [currentEnd, currentStart, currentStatus])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams({
          start: startDate,
          end: endDate,
        })

        if (status !== "all") {
          params.set("status", status)
        }

        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`)
        })
      }}
      className="grid gap-3 lg:grid-cols-[220px_220px_220px_auto]"
    >
      <Input
        type="date"
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
      />
      <Input
        type="date"
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
      />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {getFiscalStatusOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
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
            setStartDate(currentStart)
            setEndDate(currentEnd)
            setStatus("all")
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
