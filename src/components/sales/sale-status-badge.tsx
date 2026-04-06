import { Badge } from "@/components/ui/badge"
import {
  type SaleStatus,
  getSaleStatusClasses,
  getSaleStatusLabel,
} from "@/lib/sales"

type SaleStatusBadgeProps = {
  status: SaleStatus
}

export function SaleStatusBadge({ status }: SaleStatusBadgeProps) {
  return (
    <Badge variant="outline" className={getSaleStatusClasses(status)}>
      {getSaleStatusLabel(status)}
    </Badge>
  )
}
