import { Badge } from "@workspace/ui/components/badge"
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils/cn"
import { formatPercent } from "@/lib/utils/number"

type ChangeBadgeProps = {
  value: number
  className?: string
}

export function ChangeBadge({ value, className }: ChangeBadgeProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight

  return (
    <Badge
      variant={direction === "down" ? "destructive" : "secondary"}
      className={cn(
        direction === "up" && "text-emerald-700 dark:text-emerald-400",
        direction === "flat" && "text-muted-foreground",
        className,
      )}
    >
      <Icon data-icon="inline-start" />
      {formatPercent(value, { signed: true })}
    </Badge>
  )
}
