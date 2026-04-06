import { Badge } from "@/components/ui/badge"
import {
  type PurchaseOrderStatus,
  getPurchaseOrderStatusClasses,
  getPurchaseOrderStatusLabel,
} from "@/lib/purchase-orders"

type PurchaseOrderStatusBadgeProps = {
  status: PurchaseOrderStatus
}

export function PurchaseOrderStatusBadge({
  status,
}: PurchaseOrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={getPurchaseOrderStatusClasses(status)}
    >
      {getPurchaseOrderStatusLabel(status)}
    </Badge>
  )
}
