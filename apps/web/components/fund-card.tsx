"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import type { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils/cn"
import { PendingLink } from "@/components/pending-link"

type TrackedFund = Database["public"]["Tables"]["tracked_funds"]["Row"]

type FundCardLabels = {
  fields: {
    fundCode: string
    fundType: string
    company: string
    manager: string
    latestNav: string
    latestNavDate: string
    latestNavChange: string
    lastSyncedAt: string
    dataSource: string
    unknown: string
  }
  viewDetail: string
  sync: string
  syncing: string
  requestFailed: string
}

type FundCardProps = {
  fund: TrackedFund
  lang: string
  labels: FundCardLabels
}

type SyncResponse = {
  ok: boolean
  error?: {
    code: string
    message: string
  }
}

export function FundCard({ fund, lang, labels }: FundCardProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function syncFund() {
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/funds/${fund.fund_code}/sync`, {
          method: "POST",
        })
        const result = (await response.json()) as SyncResponse

        if (!result.ok) {
          setError(result.error?.message ?? labels.requestFailed)
          return
        }

        router.refresh()
      } catch {
        setError(labels.requestFailed)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate">
              {fund.fund_name ?? labels.fields.unknown}
            </CardTitle>
            <CardDescription>
              {labels.fields.fundCode}: {fund.fund_code}
            </CardDescription>
          </div>
          {fund.fund_type ? (
            <Badge variant="outline">{fund.fund_type}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <FundMeta
          label={labels.fields.company}
          value={fund.company}
          emptyValue={labels.fields.unknown}
        />
        <FundMeta
          label={labels.fields.manager}
          value={fund.manager}
          emptyValue={labels.fields.unknown}
        />
        <FundMeta
          label={labels.fields.latestNav}
          value={formatNumberValue(fund.latest_nav)}
          emptyValue={labels.fields.unknown}
        />
        <FundMeta
          label={labels.fields.latestNavDate}
          value={fund.latest_nav_date}
          emptyValue={labels.fields.unknown}
        />
        <FundMeta
          label={labels.fields.latestNavChange}
          value={
            fund.latest_nav_change_pct === null
              ? null
              : `${formatSignedNumber(fund.latest_nav_change_pct)}%`
          }
          emptyValue={labels.fields.unknown}
          valueClassName={cn(
            Number(fund.latest_nav_change_pct ?? 0) > 0 &&
              "text-emerald-700 dark:text-emerald-400",
            Number(fund.latest_nav_change_pct ?? 0) < 0 && "text-destructive",
          )}
        />
        <FundMeta
          label={labels.fields.lastSyncedAt}
          value={formatDateTime(
            fund.last_synced_at,
            lang === "zh" ? "zh-CN" : "en-US",
          )}
          emptyValue={labels.fields.unknown}
        />
        <FundMeta
          label={labels.fields.dataSource}
          value={fund.source}
          emptyValue={labels.fields.unknown}
        />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
        {error ? (
          <p className="mr-auto text-xs text-destructive">{error}</p>
        ) : null}
        <Button
          nativeButton={false}
          variant="outline"
          render={<PendingLink href={`/${lang}/funds/${fund.fund_code}`} />}
        >
          {labels.viewDetail}
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="button"
          onClick={syncFund}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {isPending ? labels.syncing : labels.sync}
        </Button>
      </CardFooter>
    </Card>
  )
}

function FundMeta({
  label,
  value,
  emptyValue,
  valueClassName,
}: {
  label: string
  value: string | number | null | undefined
  emptyValue?: string
  valueClassName?: string
}) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-medium tabular-nums", valueClassName)}>
        {value ?? emptyValue ?? ""}
      </div>
    </div>
  )
}

function formatNumberValue(value: number | null) {
  if (value === null) {
    return null
  }

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatSignedNumber(value: number) {
  const formatted = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return value > 0 ? `+${formatted}` : formatted
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
