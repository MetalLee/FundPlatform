import { ArrowLeft } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { AppShell } from "@/components/app-shell"
import {
  ContributionTable,
  type ContributionRow,
} from "@/components/contribution-table"
import { DataCard } from "@/components/data-card"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { EstimatedChangeCard } from "@/components/estimated-change-card"
import { FundHoldingsTable } from "@/components/fund-holdings-table"
import { PageHeader } from "@/components/page-header"
import { PendingLink } from "@/components/pending-link"
import { RiskNotice } from "@/components/risk-notice"
import {
  getFundDetail,
  type FundDetail as FundDetailData,
} from "@/lib/services/fund-service"
import type { Database, Json } from "@/lib/supabase/types"

import { getDictionary, getShellLabels, hasLocale } from "../../dictionaries"

type FundHolding = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuote = Database["public"]["Tables"]["market_quotes"]["Row"]

export const dynamic = "force-dynamic"

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ lang: string; fundCode: string }>
}) {
  const { lang, fundCode } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)
  const detailResponse = await getFundDetail(null, fundCode)

  return (
    <AppShell
      lang={lang}
      path={`/funds/${fundCode}`}
      labels={getShellLabels(lang)}
      title={dict.shell.titles.fundDetail}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageTitle
          lang={lang}
          title={`${dict.fundDetail.titlePrefix} ${fundCode}`}
          description={dict.fundDetail.description}
          backToList={dict.fundDetail.backToList}
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        {!detailResponse.ok ? (
          <ErrorState
            title={dict.fundDetail.loadErrorTitle}
            description={dict.fundDetail.loadErrorDescription}
          />
        ) : detailResponse.data.fund === null ? (
          <EmptyState
            title={dict.fundDetail.emptyTitle}
            description={dict.fundDetail.emptyDescription}
          />
        ) : (
          <FundDetailContent
            detail={detailResponse.data}
            lang={lang}
            labels={dict.fundDetail}
          />
        )}
      </div>
    </AppShell>
  )
}

function PageTitle({
  lang,
  title,
  description,
  backToList,
}: {
  lang: string
  title: string
  description: string
  backToList: string
}) {
  return (
    <PageHeader
      title={title}
      description={description}
      action={
        <Button
          nativeButton={false}
          variant="outline"
          render={<PendingLink href={`/${lang}/funds`} />}
        >
          <ArrowLeft className="size-4" />
          {backToList}
        </Button>
      }
    />
  )
}

function FundDetailContent({
  detail,
  lang,
  labels,
}: {
  detail: FundDetailData
  lang: string
  labels: ReturnType<typeof getDictionary>["fundDetail"]
}) {
  const locale = lang === "zh" ? "zh-CN" : "en-US"
  const contributionRows = buildContributionRows(detail.holdings, detail.quotes)
  const warnings = buildWarnings(
    detail.latestEstimate?.warnings,
    detail.coverage.warnings,
  )
  const estimatedChangePct = toFiniteNumber(
    detail.latestEstimate?.estimated_change_pct,
  )
  const coveredWeightPct =
    toFiniteNumber(detail.latestEstimate?.covered_weight_pct) ??
    detail.coverage.coveredWeightPct

  return (
    <>
      <DataCard
        title={labels.basicInfoTitle}
        description={labels.basicInfoDescription}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FundMeta
            label={labels.fields.fundName}
            value={detail.fund?.fund_name}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.fundCode}
            value={detail.fund?.fund_code}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.fundType}
            value={detail.fund?.fund_type}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.company}
            value={detail.fund?.company}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.manager}
            value={detail.fund?.manager}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.latestNav}
            value={detail.fund?.latest_nav}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.latestNavDate}
            value={detail.fund?.latest_nav_date}
            emptyValue={labels.fields.unknown}
          />
          <FundMeta
            label={labels.fields.source}
            value={detail.fund?.source}
            emptyValue={labels.fields.unknown}
          />
        </div>
      </DataCard>

      <EstimatedChangeCard
        estimatedChangePct={estimatedChangePct}
        coveredWeightPct={coveredWeightPct}
        dataSource={buildDataSource(detail)}
        lastUpdatedAt={buildLastUpdatedAt(detail)}
        warnings={warnings}
        labels={labels.estimate}
        locale={locale}
      />

      <DataCard
        title={labels.holdings.title}
        description={labels.holdings.description}
      >
        <FundHoldingsTable
          holdings={detail.holdings}
          labels={labels.holdings}
          unknownLabel={labels.fields.unknown}
        />
      </DataCard>

      <DataCard
        title={labels.contributions.title}
        description={labels.contributions.description}
      >
        <ContributionTable
          rows={contributionRows}
          labels={labels.contributions}
          unknownLabel={labels.fields.unknown}
        />
      </DataCard>
    </>
  )
}

function FundMeta({
  label,
  value,
  emptyValue,
}: {
  label: string
  value: string | number | null | undefined
  emptyValue: string
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium tabular-nums">
        {value ?? emptyValue}
      </div>
    </div>
  )
}

function buildContributionRows(
  holdings: FundHolding[],
  quotes: MarketQuote[],
): ContributionRow[] {
  const quoteMap = new Map(
    quotes.map((quote) => [`${quote.market}:${quote.symbol}`, quote]),
  )

  return holdings
    .filter((holding) => holding.asset_type === "stock")
    .flatMap((holding) => {
      const market = holding.market ?? "OTHER"
      const quote = quoteMap.get(`${market}:${holding.symbol}`)
      const changePct = toFiniteNumber(quote?.change_pct)

      if (!quote || changePct === null) {
        return []
      }

      const weightPct = Number(holding.weight_pct ?? 0)

      return [
        {
          market,
          symbol: holding.symbol,
          name: holding.name ?? quote.name,
          weightPct,
          changePct,
          contributionPct: (weightPct * changePct) / 100,
        },
      ]
    })
    .sort(
      (left, right) =>
        Math.abs(right.contributionPct) - Math.abs(left.contributionPct),
    )
}

function buildWarnings(value: Json | undefined, coverageWarnings: string[]) {
  const warnings = new Set<string>()

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        warnings.add(item)
      }
    }
  }

  for (const warning of coverageWarnings) {
    warnings.add(warning)
  }

  return Array.from(warnings)
}

function buildDataSource(detail: FundDetailData) {
  const sources = new Set<string>()

  if (detail.fund?.source) {
    sources.add(detail.fund.source)
  }

  for (const holding of detail.holdings) {
    if (holding.source) {
      sources.add(holding.source)
    }
  }

  for (const quote of detail.quotes) {
    if (quote.source) {
      sources.add(quote.source)
    }
  }

  return Array.from(sources).join(" / ") || "-"
}

function buildLastUpdatedAt(detail: FundDetailData) {
  return (
    detail.fund?.last_synced_at ??
    detail.latestEstimate?.created_at ??
    detail.quotes.find((quote) => quote.quote_time)?.quote_time ??
    null
  )
}

function toFiniteNumber(value: number | null | undefined) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}
