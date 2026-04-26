"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ColorOption = {
  label: string
  value: string
  hex: string | null
}

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
}

const COLOR_OPTIONS: ColorOption[] = [
  { label: "Preto", value: "Preto", hex: "#1a1a1a" },
  { label: "Branco", value: "Branco", hex: "#f5f5f5" },
  { label: "Prata", value: "Prata", hex: "#c0c0c0" },
  { label: "Dourado", value: "Dourado", hex: "#FFD700" },
  { label: "Azul", value: "Azul", hex: "#2563eb" },
  { label: "Vermelho", value: "Vermelho", hex: "#dc2626" },
  { label: "Verde", value: "Verde", hex: "#16a34a" },
  { label: "Roxo", value: "Roxo", hex: "#9333ea" },
  { label: "Rosa", value: "Rosa", hex: "#ec4899" },
  { label: "Amarelo", value: "Amarelo", hex: "#ca8a04" },
  { label: "Laranja", value: "Laranja", hex: "#ea580c" },
  { label: "Cinza", value: "Cinza", hex: "#6b7280" },
  { label: "Outro", value: "", hex: null },
]

function findPresetColor(value: string) {
  const normalized = value.trim().toLowerCase()

  return COLOR_OPTIONS.find(
    (option) => option.value && option.value.toLowerCase() === normalized
  )
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isCustom, setIsCustom] = useState(() => {
    const trimmed = value.trim()

    return trimmed.length > 0 && !findPresetColor(trimmed)
  })

  useEffect(() => {
    const trimmed = value.trim()

    if (!trimmed) {
      return
    }

    setIsCustom(!findPresetColor(trimmed))
  }, [value])

  const selectedPreset = findPresetColor(value)
  const selectedLabel = isCustom
    ? value.trim() || "Outro"
    : selectedPreset?.label ?? null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-3 sm:grid-cols-7">
        {COLOR_OPTIONS.map((option) => {
          const isSelected = option.value
            ? selectedPreset?.value === option.value && !isCustom
            : isCustom

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                if (option.value) {
                  setIsCustom(false)
                  onChange(option.value)
                  return
                }

                setIsCustom(true)
                onChange(selectedPreset ? "" : value)
              }}
              className="flex flex-col items-center gap-2 text-center"
              aria-label={`Selecionar cor ${option.label}`}
            >
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground transition-all",
                  isSelected &&
                    "ring-4 ring-orange-500 ring-offset-2 ring-offset-background"
                )}
                style={
                  option.hex
                    ? { backgroundColor: option.hex, borderColor: option.hex === "#f5f5f5" ? "#d4d4d8" : option.hex }
                    : undefined
                }
              >
                {option.hex ? null : "Aa"}
              </span>
              <span className="text-xs text-muted-foreground">
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {isCustom ? (
        <Input
          value={value}
          placeholder="Digite a cor"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      <div className="text-sm text-muted-foreground">
        {selectedLabel ? `Cor selecionada: ${selectedLabel}` : "Selecione uma cor."}
      </div>
    </div>
  )
}
