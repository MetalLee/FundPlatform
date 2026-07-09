import type { ReactNode } from "react"

import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils/cn"

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-6 text-center",
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-background ring-1 ring-border">
        <Inbox className="size-4 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <div className="font-medium">{title}</div>
        {description ? (
          <p className="max-w-md text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
