import { cn } from "@/lib/utils/cn"
import { formatCny } from "@/lib/utils/number"

type MoneyTextProps = {
  value: number
  compact?: boolean
  className?: string
}

export function MoneyText({ value, compact, className }: MoneyTextProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatCny(value, { compact })}
    </span>
  )
}
