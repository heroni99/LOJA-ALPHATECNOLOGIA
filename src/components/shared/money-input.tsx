"use client"

import { Input } from "@/components/ui/input"
import { formatCurrencyInputFromCents, parseCurrencyInputToCents } from "@/lib/products"

type MoneyInputProps = {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
}

export function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        value={formatCurrencyInputFromCents(value)}
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10"
        onChange={(event) => onChange(parseCurrencyInputToCents(event.target.value))}
      />
    </div>
  )
}
