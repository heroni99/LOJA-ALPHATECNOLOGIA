import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type PageHeaderProps = {
  title: string
  description?: string
  badge?: ReactNode
  titleSlot?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  badge,
  titleSlot,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {badge ? (
            <Badge variant="outline" className="border-primary/20 text-primary">
              {badge}
            </Badge>
          ) : null}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {titleSlot}
            </div>
            {description ? (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
      <Separator />
    </div>
  )
}
