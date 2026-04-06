import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/70 bg-card/95 shadow-sm shadow-black/5",
        className
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {value}
            </CardTitle>
          </div>
          {icon ? (
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  )
}
