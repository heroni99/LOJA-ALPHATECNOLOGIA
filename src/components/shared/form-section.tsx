import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FormSectionProps = {
  title: string
  children: ReactNode
  columns?: 1 | 2
  className?: string
}

export function FormSection({
  title,
  children,
  columns = 2,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("grid gap-4", className)}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
      </header>
      <div
        className={cn(
          "grid gap-4",
          columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
        )}
      >
        {children}
      </div>
    </section>
  )
}
