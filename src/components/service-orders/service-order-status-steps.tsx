import { cn } from "@/lib/utils"
import {
  type ServiceOrderStatus,
  getServiceOrderStatusLabel,
  getServiceOrderStatusNoteLabel,
  serviceOrderMainFlowStatuses,
} from "@/lib/service-orders"

type ServiceOrderStatusStepsProps = {
  status: ServiceOrderStatus
}

export function ServiceOrderStatusSteps({
  status,
}: ServiceOrderStatusStepsProps) {
  const currentIndex = serviceOrderMainFlowStatuses.indexOf(status)
  const statusNote = getServiceOrderStatusNoteLabel(status)

  return (
    <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {serviceOrderMainFlowStatuses.map((step, index) => {
          const isCompleted = currentIndex >= 0 && index < currentIndex
          const isCurrent = step === status

          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {getServiceOrderStatusLabel(step)}
                </p>
              </div>
              {index < serviceOrderMainFlowStatuses.length - 1 ? (
                <div
                  className={cn(
                    "hidden h-px flex-1 lg:block",
                    currentIndex > index ? "bg-primary" : "bg-border"
                  )}
                />
              ) : null}
            </div>
          )
        })}
      </div>
      {statusNote ? (
        <p className="mt-4 text-sm text-muted-foreground">{statusNote}</p>
      ) : null}
    </div>
  )
}
