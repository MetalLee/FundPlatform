import { Clock3 } from "lucide-react"

import { cn } from "@/lib/utils/cn"
import { formatDateTime } from "@/lib/utils/date"

type LastUpdatedTextProps = {
  value: Date | string | number
  label: string
  locale?: string
  className?: string
}

export function LastUpdatedText({
  value,
  label,
  locale,
  className,
}: LastUpdatedTextProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Clock3 className="size-3" />
      {label}: {formatDateTime(value, locale)}
    </span>
  )
}
