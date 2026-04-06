import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page-header"

type FormPageProps = {
  title: string
  description?: string
  titleSlot?: ReactNode
  children: ReactNode
  footer: ReactNode
}

export function FormPage({
  title,
  description,
  titleSlot,
  children,
  footer,
}: FormPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        titleSlot={titleSlot}
      />
      <div className="pb-28">{children}</div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] justify-end gap-3 px-4 py-4 md:px-6 lg:px-8">
          {footer}
        </div>
      </div>
    </div>
  )
}
