import type { ComponentProps, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ActionDialogButtonProps = {
  label: string
  title: string
  icon: LucideIcon
  variant?: ComponentProps<typeof Button>["variant"]
  children: ReactNode
}

export function ActionDialogButton({
  label,
  title,
  icon: Icon,
  variant = "outline",
  children,
}: ActionDialogButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} className="gap-2">
          <Icon className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
