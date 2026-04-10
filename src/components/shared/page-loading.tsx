import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type PageLoadingProps = {
  rows?: number
  className?: string
}

export function PageLoading({
  rows = 10,
  className,
}: PageLoadingProps) {
  return (
    <div className={cn("flex min-h-[60vh] flex-col gap-6", className)}>
      <div className="space-y-3">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <Skeleton className="h-5 w-full max-w-3xl rounded-2xl" />
      </div>

      <div className="rounded-4xl border border-border/70 bg-card/95 p-6 shadow-sm shadow-black/5">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-10 rounded-3xl" />
          <Skeleton className="h-10 rounded-3xl" />
          <Skeleton className="h-10 rounded-3xl" />
        </div>
      </div>

      <div className="rounded-4xl border border-border/70 bg-card/95 p-6 shadow-sm shadow-black/5">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48 rounded-2xl" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-2xl" />
        </div>

        <div className="mt-6 space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={`page-loading-row-${index}`}
              className="grid gap-3 rounded-3xl border border-border/60 p-4 md:grid-cols-4"
            >
              <Skeleton className="h-5 rounded-2xl" />
              <Skeleton className="h-5 rounded-2xl" />
              <Skeleton className="h-5 rounded-2xl" />
              <Skeleton className="h-5 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
