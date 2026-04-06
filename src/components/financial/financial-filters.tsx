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

type FinancialFiltersProps = {
  currentStatus: string | null
  currentDueFrom: string | null
  currentDueTo: string | null
  statuses: Array<{ value: string; label: string }>
}

export function FinancialFilters({
  currentStatus,
  currentDueFrom,
  currentDueTo,
  statuses,
}: FinancialFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(currentStatus ?? "all")
  const [dueFrom, setDueFrom] = useState(currentDueFrom ?? "")
  const [dueTo, setDueTo] = useState(currentDueTo ?? "")

  useEffect(() => {
    setStatus(currentStatus ?? "all")
    setDueFrom(currentDueFrom ?? "")
    setDueTo(currentDueTo ?? "")
  }, [currentStatus, currentDueFrom, currentDueTo])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams()

        if (status !== "all") {
          params.set("status", status)
        }

        if (dueFrom) {
          params.set("due_from", dueFrom)
        }

        if (dueTo) {
          params.set("due_to", dueTo)
        }

        startTransition(() => {
          router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
        })
      }}
      className="grid gap-3 lg:grid-cols-[220px_180px_180px_auto]"
    >
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {statuses.map((statusOption) => (
            <SelectItem key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input type="date" value={dueFrom} onChange={(event) => setDueFrom(event.target.value)} />
      <Input type="date" value={dueTo} onChange={(event) => setDueTo(event.target.value)} />

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button type="submit" disabled={isPending}>
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setStatus("all")
            setDueFrom("")
            setDueTo("")
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
