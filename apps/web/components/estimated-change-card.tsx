import type { ReactNode } from "react"

import { AlertTriangle } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ChangeBadge } from "@/components/finance/change-badge"
import { LastUpdatedText } from "@/components/finance/last-updated-text"
import { PercentText } from "@/components/finance/percent-text"

type EstimatedChangeCardLabels = {
  title: string
  description: string
  estimatedChange: string
  coveredWeight: string
  dataSource: string
  lastUpdated: string
  warnings: string
  noWarnings: string
  noEstimate: string
}

type EstimatedChangeCardProps = {
  estimatedChangePct: number | null
  coveredWeightPct: number
  dataSource: string
  lastUpdatedAt: string | null
  warnings: string[]
  labels: EstimatedChangeCardLabels
  locale: string
}

export function EstimatedChangeCard({
  estimatedChangePct,
  coveredWeightPct,
  dataSource,
  lastUpdatedAt,
  warnings,
  labels,
  locale,
}: EstimatedChangeCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{labels.title}</CardTitle>
            <CardDescription>{labels.description}</CardDescription>
          </div>
          {estimatedChangePct === null ? (
            <Badge variant="outline">{labels.noEstimate}</Badge>
          ) : (
            <ChangeBadge value={estimatedChangePct / 100} locale={locale} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EstimateMeta
            label={labels.estimatedChange}
            value={
              estimatedChangePct === null ? (
                labels.noEstimate
              ) : (
                <ChangeBadge value={estimatedChangePct / 100} locale={locale} />
              )
            }
          />
          <EstimateMeta
            label={labels.coveredWeight}
            value={<PercentText value={coveredWeightPct / 100} />}
          />
          <EstimateMeta label={labels.dataSource} value={dataSource} />
          <EstimateMeta
            label={labels.lastUpdated}
            value={
              lastUpdatedAt ? (
                <LastUpdatedText
                  label={labels.lastUpdated}
                  value={lastUpdatedAt}
                  locale={locale}
                  className="text-foreground"
                />
              ) : (
                labels.noEstimate
              )
            }
          />
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium">
            <AlertTriangle className="size-3.5 text-muted-foreground" />
            {labels.warnings}
          </div>
          {warnings.length > 0 ? (
            <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{labels.noWarnings}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EstimateMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
    </div>
  )
}
