import { Badge } from "@/components/ui/badge"
import { getProductStatusLabel } from "@/lib/products"

type ProductStatusBadgeProps = {
  active: boolean
}

export function ProductStatusBadge({ active }: ProductStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      {getProductStatusLabel(active)}
    </Badge>
  )
}
