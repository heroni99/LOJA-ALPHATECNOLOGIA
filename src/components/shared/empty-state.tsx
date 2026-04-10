import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  hint?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-start justify-center rounded-3xl border border-dashed border-border bg-muted/35 p-6",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="mt-5 space-y-2">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {hint ? (
        <Badge variant="outline" className="mt-4 border-primary/20 text-primary">
          {hint}
        </Badge>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
