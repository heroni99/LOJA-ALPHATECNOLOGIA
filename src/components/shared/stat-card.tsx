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
  label?: string
  title?: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
}

export function StatCard({
  label,
  title,
  value,
  description,
  icon,
  variant = "default",
  className,
}: StatCardProps) {
  const resolvedLabel = label ?? title ?? ""
  const variantClasses = {
    default: {
      card: "border border-border/70 bg-card/95",
      icon: "bg-primary/10 text-primary",
    },
    success: {
      card: "border border-emerald-200/80 bg-emerald-50/40",
      icon: "bg-emerald-100 text-emerald-700",
    },
    warning: {
      card: "border border-amber-200/80 bg-amber-50/40",
      icon: "bg-amber-100 text-amber-700",
    },
    danger: {
      card: "border border-red-200/80 bg-red-50/40",
      icon: "bg-red-100 text-red-700",
    },
  }[variant]

  return (
    <Card
      className={cn(
        "shadow-sm shadow-black/5",
        variantClasses.card,
        className
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>{resolvedLabel}</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {value}
            </CardTitle>
          </div>
          {icon ? (
            <div className={cn("rounded-2xl p-3", variantClasses.icon)}>
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
