import { Badge } from "@workspace/ui/components/badge"
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils/cn"
import { formatPercent } from "@/lib/utils/number"

type ChangeBadgeProps = {
  value: number
  locale: string
  className?: string
}

export const CHANGE_BADGE_VARIANT = "secondary" as const

export function getChangeBadgeColor(
  value: number,
  locale: string,
): "red" | "green" | "neutral" {
  if (value === 0) {
    return "neutral"
  }

  const isChinese = locale.toLowerCase().startsWith("zh")
  const isGain = value > 0

  return isGain === isChinese ? "red" : "green"
}

export function ChangeBadge({ value, locale, className }: ChangeBadgeProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  const color = getChangeBadgeColor(value, locale)
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight

  return (
    <Badge
      variant={CHANGE_BADGE_VARIANT}
      className={cn(
        color === "red" && "text-red-700 dark:text-red-300",
        color === "green" && "text-emerald-700 dark:text-emerald-300",
        color === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      <Icon data-icon="inline-start" />
      {formatPercent(value, { signed: true })}
    </Badge>
  )
}
