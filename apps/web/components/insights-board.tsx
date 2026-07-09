"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bot, Loader2, Save } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { EmptyState } from "@/components/empty-state"
import type { Database } from "@/lib/supabase/types"

type InsightSource = Database["public"]["Tables"]["insight_sources"]["Row"]

type InsightsBoardLabels = {
  formTitle: string
  formDescription: string
  listTitle: string
  listDescription: string
  disabledTitle: string
  disabledDescription: string
  save: string
  saving: string
  saveSuccess: string
  saveFailed: string
  emptyTitle: string
  emptyDescription: string
  fields: {
    title: string
    sourceType: string
    url: string
    content: string
    relatedMarkets: string
    relatedSymbols: string
    relatedFundCodes: string
    sentiment: string
    importance: string
  }
  sourceTypes: Record<string, string>
  sentiments: Record<string, string>
}

type InsightsBoardProps = {
  sources: InsightSource[]
  labels: InsightsBoardLabels
}

type InsightResponse = {
  ok: boolean
  error?: {
    code: string
    message: string
  }
}

const SOURCE_TYPES = ["news", "policy", "macro", "industry", "manual"]
const SENTIMENTS = ["positive", "neutral", "negative", "unknown"]

export function InsightsBoard({ sources, labels }: InsightsBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <InsightForm labels={labels} />
        <DisabledAiCard labels={labels} />
      </div>
      <InsightList sources={sources} labels={labels} />
    </div>
  )
}

function InsightForm({ labels }: { labels: InsightsBoardLabels }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [form, setForm] = useState({
    title: "",
    sourceType: "manual",
    url: "",
    content: "",
    relatedMarkets: "",
    relatedSymbols: "",
    relatedFundCodes: "",
    sentiment: "unknown",
    importance: "3",
  })

  function updateField(field: keyof typeof form, value: string) {
    setStatus("idle")
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitInsight() {
    setStatus("idle")

    startTransition(async () => {
      try {
        const response = await fetch("/api/insights/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            sourceType: form.sourceType,
            url: form.url,
            content: form.content,
            relatedMarkets: toList(form.relatedMarkets),
            relatedSymbols: toList(form.relatedSymbols),
            relatedFundCodes: toList(form.relatedFundCodes),
            sentiment: form.sentiment,
            importance: Number(form.importance),
          }),
        })
        const result = (await response.json()) as InsightResponse

        if (!result.ok) {
          setStatus("error")
          return
        }

        setStatus("success")
        setForm((current) => ({
          ...current,
          title: "",
          url: "",
          content: "",
          relatedMarkets: "",
          relatedSymbols: "",
          relatedFundCodes: "",
          sentiment: "unknown",
          importance: "3",
        }))
        router.refresh()
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.formTitle}</CardTitle>
        <CardDescription>{labels.formDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TextField
          id="insight-title"
          label={labels.fields.title}
          value={form.title}
          onChange={(value) => updateField("title", value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="insight-source-type"
            label={labels.fields.sourceType}
            value={form.sourceType}
            options={SOURCE_TYPES}
            labels={labels.sourceTypes}
            onChange={(value) => updateField("sourceType", value)}
          />
          <SelectField
            id="insight-sentiment"
            label={labels.fields.sentiment}
            value={form.sentiment}
            options={SENTIMENTS}
            labels={labels.sentiments}
            onChange={(value) => updateField("sentiment", value)}
          />
        </div>
        <TextField
          id="insight-url"
          label={labels.fields.url}
          value={form.url}
          onChange={(value) => updateField("url", value)}
        />
        <div className="space-y-1.5">
          <Label htmlFor="insight-content">{labels.fields.content}</Label>
          <Textarea
            id="insight-content"
            value={form.content}
            onChange={(event) => updateField("content", event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            id="insight-markets"
            label={labels.fields.relatedMarkets}
            value={form.relatedMarkets}
            onChange={(value) => updateField("relatedMarkets", value)}
          />
          <TextField
            id="insight-symbols"
            label={labels.fields.relatedSymbols}
            value={form.relatedSymbols}
            onChange={(value) => updateField("relatedSymbols", value)}
          />
          <TextField
            id="insight-funds"
            label={labels.fields.relatedFundCodes}
            value={form.relatedFundCodes}
            onChange={(value) => updateField("relatedFundCodes", value)}
          />
        </div>
        <TextField
          id="insight-importance"
          label={labels.fields.importance}
          type="number"
          min="1"
          max="5"
          value={form.importance}
          onChange={(value) => updateField("importance", value)}
        />
        <div className="flex items-center justify-between gap-3">
          {status === "success" ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {labels.saveSuccess}
            </p>
          ) : status === "error" ? (
            <p className="text-xs text-destructive">{labels.saveFailed}</p>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={submitInsight}
            disabled={isPending || !form.title.trim()}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? labels.saving : labels.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DisabledAiCard({ labels }: { labels: InsightsBoardLabels }) {
  return (
    <Card className="opacity-75">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <CardTitle>{labels.disabledTitle}</CardTitle>
        </div>
        <CardDescription>{labels.disabledDescription}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function InsightList({
  sources,
  labels,
}: {
  sources: InsightSource[]
  labels: InsightsBoardLabels
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.listTitle}</CardTitle>
        <CardDescription>{labels.listDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <EmptyState
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <article key={source.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-sm font-medium">
                      {source.title}
                    </h3>
                    <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {source.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <Badge variant="outline">{source.source_type}</Badge>
                    <Badge variant="secondary">
                      {source.sentiment ?? "unknown"}
                    </Badge>
                    <Badge variant="outline">
                      {labels.fields.importance}: {source.importance ?? 3}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {[
                    ...(source.related_markets ?? []),
                    ...(source.related_symbols ?? []),
                    ...(source.related_fund_codes ?? []),
                  ].map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
  max?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  labels,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[]
  labels: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </div>
  )
}

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
