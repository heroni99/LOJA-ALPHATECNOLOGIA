import { Badge } from "@/components/ui/badge"
import {
  type ServiceOrderStatus,
  getServiceOrderStatusClasses,
  getServiceOrderStatusLabel,
} from "@/lib/service-orders"

type ServiceOrderStatusBadgeProps = {
  status: ServiceOrderStatus
}

export function ServiceOrderStatusBadge({
  status,
}: ServiceOrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={getServiceOrderStatusClasses(status)}
    >
      {getServiceOrderStatusLabel(status)}
    </Badge>
  )
}
