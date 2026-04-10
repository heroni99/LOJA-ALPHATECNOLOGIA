import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageHeaderProps = {
  title: string
  subtitle?: string
  description?: string
  badge?: ReactNode
  backHref?: string
  breadcrumbs?: BreadcrumbItem[]
  titleSlot?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  description,
  badge,
  backHref,
  breadcrumbs,
  titleSlot,
  actions,
}: PageHeaderProps) {
  const resolvedSubtitle = subtitle ?? description

  return (
    <div className="space-y-4">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs items={breadcrumbs} />
      ) : null}
      {backHref ? (
        <Button variant="ghost" size="sm" asChild className="w-fit px-0">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      ) : null}
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
            {resolvedSubtitle ? (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {resolvedSubtitle}
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
