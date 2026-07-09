import { cn } from "@/lib/utils/cn"
import { formatPercent } from "@/lib/utils/number"

type PercentTextProps = {
  value: number
  signed?: boolean
  className?: string
}

export function PercentText({ value, signed, className }: PercentTextProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatPercent(value, { signed })}
    </span>
  )
}
