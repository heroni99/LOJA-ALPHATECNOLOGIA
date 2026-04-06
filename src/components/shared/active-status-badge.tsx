import { Badge } from "@/components/ui/badge"

type ActiveStatusBadgeProps = {
  active: boolean
}

export function ActiveStatusBadge({ active }: ActiveStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      {active ? "Ativo" : "Inativo"}
    </Badge>
  )
}
