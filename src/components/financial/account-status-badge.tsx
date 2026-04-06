import { Badge } from "@/components/ui/badge"
import {
  getAccountStatusClasses,
  getAccountStatusLabel,
} from "@/lib/financial"

type AccountStatusBadgeProps = {
  status: string
  isOverdue?: boolean
}

export function AccountStatusBadge({
  status,
  isOverdue = false,
}: AccountStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={getAccountStatusClasses(status, isOverdue)}
    >
      {isOverdue ? "Vencida" : getAccountStatusLabel(status)}
    </Badge>
  )
}
