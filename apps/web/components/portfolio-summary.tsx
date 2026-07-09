"use client"

import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { ChangeBadge } from "@/components/finance/change-badge"
import { MoneyText } from "@/components/finance/money-text"
import { PercentText } from "@/components/finance/percent-text"
import { MetricCard } from "@/components/metric-card"

export type PortfolioFundItem = {
  fundCode: string
  fundName: string | null
  fundType: string | null
  position: {
    holdingAmount: number
    holdingShares: number
    costAmount: number
    dailyInvestAmount: number
    note: string | null
  }
  estimate: {
    estimatedChangePct: number
    estimatedProfitAmount: number
  }
}

export type PortfolioSummaryLabels = {
  summary: {
    title: string
    holdingAmount: string
    costAmount: string
    dailyInvestAmount: string
    estimatedProfit: string
    estimatedChange: string
  }
  positionsTitle: string
  positionsDescription: string
  fields: {
    holdingAmount: string
    holdingShares: string
    costAmount: string
    dailyInvestAmount: string
    note: string
    estimatedChange: string
    estimatedProfit: string
    fundCode: string
    unknown: string
  }
  save: string
  saving: string
  saveSuccess: string
  saveFailed: string
}

type PortfolioSummaryProps = {
  items: PortfolioFundItem[]
  labels: PortfolioSummaryLabels
}

type UpsertResponse = {
  ok: boolean
  error?: {
    code: string
    message: string
  }
}

export function PortfolioSummary({ items, labels }: PortfolioSummaryProps) {
  const totalHoldingAmount = items.reduce(
    (sum, item) => sum + item.position.holdingAmount,
    0,
  )
  const totalCostAmount = items.reduce(
    (sum, item) => sum + item.position.costAmount,
    0,
  )
  const totalDailyInvestAmount = items.reduce(
    (sum, item) => sum + item.position.dailyInvestAmount,
    0,
  )
  const estimatedProfitAmount = items.reduce(
    (sum, item) => sum + item.estimate.estimatedProfitAmount,
    0,
  )
  const estimatedChangePct =
    totalHoldingAmount > 0
      ? (estimatedProfitAmount / totalHoldingAmount) * 100
      : 0

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title={labels.summary.holdingAmount}
          value={<MoneyText value={totalHoldingAmount} compact />}
        />
        <MetricCard
          title={labels.summary.costAmount}
          value={<MoneyText value={totalCostAmount} compact />}
        />
        <MetricCard
          title={labels.summary.dailyInvestAmount}
          value={<MoneyText value={totalDailyInvestAmount} compact />}
        />
        <MetricCard
          title={labels.summary.estimatedProfit}
          value={<MoneyText value={estimatedProfitAmount} compact />}
          trend={<ChangeBadge value={estimatedChangePct / 100} />}
        />
        <MetricCard
          title={labels.summary.estimatedChange}
          value={<PercentText value={estimatedChangePct / 100} signed />}
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{labels.positionsTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {labels.positionsDescription}
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <PortfolioPositionCard
              key={item.fundCode}
              item={item}
              labels={labels}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function PortfolioPositionCard({
  item,
  labels,
}: {
  item: PortfolioFundItem
  labels: PortfolioSummaryLabels
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [form, setForm] = useState({
    holdingAmount: String(item.position.holdingAmount),
    holdingShares: String(item.position.holdingShares),
    costAmount: String(item.position.costAmount),
    dailyInvestAmount: String(item.position.dailyInvestAmount),
    note: item.position.note ?? "",
  })

  function updateField(field: keyof typeof form, value: string) {
    setStatus("idle")
    setForm((current) => ({ ...current, [field]: value }))
  }

  function savePosition() {
    setStatus("idle")

    startTransition(async () => {
      try {
        const response = await fetch("/api/portfolio/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fundCode: item.fundCode,
            holdingAmount: toNumber(form.holdingAmount),
            holdingShares: toNumber(form.holdingShares),
            costAmount: toNumber(form.costAmount),
            dailyInvestAmount: toNumber(form.dailyInvestAmount),
            note: form.note,
          }),
        })
        const result = (await response.json()) as UpsertResponse

        if (!result.ok) {
          setStatus("error")
          return
        }

        setStatus("success")
        router.refresh()
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate">
              {item.fundName ?? labels.fields.unknown}
            </CardTitle>
            <CardDescription>
              {labels.fields.fundCode}: {item.fundCode}
              {item.fundType ? ` · ${item.fundType}` : ""}
            </CardDescription>
          </div>
          <ChangeBadge value={item.estimate.estimatedChangePct / 100} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PositionMetric
            label={labels.fields.estimatedChange}
            value={
              <PercentText
                value={item.estimate.estimatedChangePct / 100}
                signed
              />
            }
          />
          <PositionMetric
            label={labels.fields.estimatedProfit}
            value={<MoneyText value={item.estimate.estimatedProfitAmount} />}
          />
          <PositionMetric
            label={labels.fields.costAmount}
            value={<MoneyText value={item.position.costAmount} />}
          />
          <PositionMetric
            label={labels.fields.holdingAmount}
            value={<MoneyText value={item.position.holdingAmount} />}
          />
          <PositionMetric
            label={labels.fields.dailyInvestAmount}
            value={<MoneyText value={item.position.dailyInvestAmount} />}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id={`${item.fundCode}-holding-amount`}
            label={labels.fields.holdingAmount}
            value={form.holdingAmount}
            onChange={(value) => updateField("holdingAmount", value)}
          />
          <NumberField
            id={`${item.fundCode}-holding-shares`}
            label={labels.fields.holdingShares}
            value={form.holdingShares}
            onChange={(value) => updateField("holdingShares", value)}
          />
          <NumberField
            id={`${item.fundCode}-cost-amount`}
            label={labels.fields.costAmount}
            value={form.costAmount}
            onChange={(value) => updateField("costAmount", value)}
          />
          <NumberField
            id={`${item.fundCode}-daily-invest-amount`}
            label={labels.fields.dailyInvestAmount}
            value={form.dailyInvestAmount}
            onChange={(value) => updateField("dailyInvestAmount", value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${item.fundCode}-note`}>{labels.fields.note}</Label>
          <Textarea
            id={`${item.fundCode}-note`}
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {status === "success" ? (
          <p className="mr-auto text-xs text-emerald-700 dark:text-emerald-400">
            {labels.saveSuccess}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mr-auto text-xs text-destructive">
            {labels.saveFailed}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={savePosition}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isPending ? labels.saving : labels.save}
        </Button>
      </CardFooter>
    </Card>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function PositionMetric({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
    </div>
  )
}

function toNumber(value: string) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}
