import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type MetricCardProps = {
  title: string
  value: ReactNode
  description?: string
  trend?: ReactNode
}

export function MetricCard({
  title,
  value,
  description,
  trend,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {trend ? <div className="shrink-0">{trend}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
