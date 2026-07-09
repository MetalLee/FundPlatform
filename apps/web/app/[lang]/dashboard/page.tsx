import { ArrowRight, Plus } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { AppShell } from "@/components/app-shell"
import { DataCard } from "@/components/data-card"
import { EmptyState } from "@/components/empty-state"
import { ChangeBadge } from "@/components/finance/change-badge"
import { MoneyText } from "@/components/finance/money-text"
import { PercentText } from "@/components/finance/percent-text"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { PendingLink } from "@/components/pending-link"
import { RiskNotice } from "@/components/risk-notice"
import {
  estimateFundDailyChange,
  type EstimateContributor,
} from "@/lib/services/estimate-service"
import { getTrackedFunds } from "@/lib/services/fund-service"
import { getUserPositions } from "@/lib/services/portfolio-service"
import type { Database } from "@/lib/supabase/types"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

type TrackedFund = Database["public"]["Tables"]["tracked_funds"]["Row"]
type UserPosition = Database["public"]["Tables"]["user_positions"]["Row"]

type FundEstimateRow = {
  fundCode: string
  fundName: string | null
  holdingAmount: number
  costAmount: number
  dailyInvestAmount: number
  estimatedChangePct: number
  estimatedProfitAmount: number
  contributors: EstimateContributor[]
}

type StockContributionRow = {
  name: string | null
  symbol: string
  market: string
  relatedFund: string
  changePct: number
  contributionPct: number
}

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)
  const [fundsResponse, positionsResponse] = await Promise.all([
    getTrackedFunds(null),
    getUserPositions(null),
  ])
  const funds = fundsResponse.ok ? dedupeFunds(fundsResponse.data) : []
  const positions = positionsResponse.ok ? positionsResponse.data : []
  const fundRows = await buildFundEstimateRows(funds, positions)
  const hasPortfolioData =
    fundRows.length > 0 &&
    fundRows.some((row) => row.holdingAmount > 0 || row.costAmount > 0)
  const summary = buildSummary(fundRows)
  const topContributors = buildTopContributors(fundRows)

  return (
    <AppShell
      lang={lang}
      path="/dashboard"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.dashboard}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.dashboard.title}
          description={dict.dashboard.description}
          action={
            <Button
              nativeButton={false}
              render={<PendingLink href={`/${lang}/funds`} />}
            >
              <Plus className="size-4" />
              {dict.dashboard.addFund}
            </Button>
          }
        />

        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        {hasPortfolioData ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                title={dict.dashboard.metrics.holdingAmount}
                value={<MoneyText value={summary.holdingAmount} compact />}
              />
              <MetricCard
                title={dict.dashboard.metrics.costAmount}
                value={<MoneyText value={summary.costAmount} compact />}
              />
              <MetricCard
                title={dict.dashboard.metrics.estimatedProfit}
                value={<MoneyText value={summary.estimatedProfitAmount} compact />}
                trend={<ChangeBadge value={summary.estimatedChangePct / 100} />}
              />
              <MetricCard
                title={dict.dashboard.metrics.estimatedChange}
                value={<PercentText value={summary.estimatedChangePct / 100} signed />}
              />
              <MetricCard
                title={dict.dashboard.metrics.dailyInvestAmount}
                value={<MoneyText value={summary.dailyInvestAmount} compact />}
              />
              <MetricCard
                title={dict.dashboard.metrics.trackedFundCount}
                value={summary.trackedFundCount}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <DataCard
                title={dict.dashboard.fundEstimatesTitle}
                description={dict.dashboard.fundEstimatesDescription}
              >
                <FundEstimateTable
                  rows={fundRows}
                  lang={lang}
                  labels={dict.dashboard.table}
                  unknownLabel={dict.dashboard.unknown}
                />
              </DataCard>

              <DataCard
                title={dict.dashboard.chartTitle}
                description={dict.dashboard.chartDescription}
              >
                <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed bg-muted/20 text-sm text-muted-foreground">
                  {dict.dashboard.chartPlaceholder}
                </div>
              </DataCard>
            </section>

            <DataCard
              title={dict.dashboard.topContributorsTitle}
              description={dict.dashboard.topContributorsDescription}
            >
              <ContributionTable
                rows={topContributors}
                labels={dict.dashboard.table}
                unknownLabel={dict.dashboard.unknown}
              />
            </DataCard>
          </>
        ) : (
          <EmptyState
            title={dict.dashboard.emptyTitle}
            description={dict.dashboard.emptyDescription}
            action={
              <Button
                nativeButton={false}
                render={<PendingLink href={`/${lang}/funds`} />}
              >
                <Plus className="size-4" />
                {dict.dashboard.addFund}
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  )
}

function FundEstimateTable({
  rows,
  lang,
  labels,
  unknownLabel,
}: {
  rows: FundEstimateRow[]
  lang: string
  labels: ReturnType<typeof getDictionary>["dashboard"]["table"]
  unknownLabel: string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.fund}</TableHead>
          <TableHead className="text-right">{labels.holdingAmount}</TableHead>
          <TableHead className="text-right">{labels.estimatedChange}</TableHead>
          <TableHead className="text-right">{labels.estimatedProfit}</TableHead>
          <TableHead className="text-right">{labels.action}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.fundCode}>
            <TableCell>
              <div className="font-medium">{row.fundName ?? unknownLabel}</div>
              <div className="text-xs text-muted-foreground">
                {row.fundCode}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={row.holdingAmount} />
            </TableCell>
            <TableCell className="text-right">
              <ChangeBadge value={row.estimatedChangePct / 100} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={row.estimatedProfitAmount} />
            </TableCell>
            <TableCell className="text-right">
              <Button
                nativeButton={false}
                variant="ghost"
                render={<PendingLink href={`/${lang}/funds/${row.fundCode}`} />}
              >
                {labels.view}
                <ArrowRight className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ContributionTable({
  rows,
  labels,
  unknownLabel,
}: {
  rows: StockContributionRow[]
  labels: ReturnType<typeof getDictionary>["dashboard"]["table"]
  unknownLabel: string
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={unknownLabel}
        description={labels.contribution}
        className="min-h-40"
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.stockName}</TableHead>
          <TableHead>{labels.stockCode}</TableHead>
          <TableHead>{labels.market}</TableHead>
          <TableHead>{labels.relatedFund}</TableHead>
          <TableHead className="text-right">{labels.stockChange}</TableHead>
          <TableHead className="text-right">{labels.contribution}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.relatedFund}:${row.market}:${row.symbol}`}>
            <TableCell>{row.name ?? unknownLabel}</TableCell>
            <TableCell className="font-medium">{row.symbol}</TableCell>
            <TableCell>
              <Badge variant="outline">{row.market}</Badge>
            </TableCell>
            <TableCell>{row.relatedFund}</TableCell>
            <TableCell className="text-right">
              <ChangeBadge value={row.changePct / 100} />
            </TableCell>
            <TableCell className="text-right">
              <PercentText value={row.contributionPct / 100} signed />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

async function buildFundEstimateRows(
  funds: TrackedFund[],
  positions: UserPosition[],
): Promise<FundEstimateRow[]> {
  const positionMap = new Map(
    positions.map((position) => [position.fund_code, position]),
  )

  return Promise.all(
    funds.map(async (fund) => {
      const position = positionMap.get(fund.fund_code)
      const holdingAmount = Number(position?.holding_amount ?? 0)
      const estimateResponse = await estimateFundDailyChange(fund.fund_code)
      const estimatedChangePct = estimateResponse.ok
        ? estimateResponse.data.estimatedChangePct
        : 0

      return {
        fundCode: fund.fund_code,
        fundName: fund.fund_name,
        holdingAmount,
        costAmount: Number(position?.cost_amount ?? 0),
        dailyInvestAmount: Number(position?.daily_invest_amount ?? 0),
        estimatedChangePct,
        estimatedProfitAmount: (holdingAmount * estimatedChangePct) / 100,
        contributors: estimateResponse.ok
          ? estimateResponse.data.topContributors
          : [],
      }
    }),
  )
}

function buildSummary(rows: FundEstimateRow[]) {
  const holdingAmount = rows.reduce((sum, row) => sum + row.holdingAmount, 0)
  const estimatedProfitAmount = rows.reduce(
    (sum, row) => sum + row.estimatedProfitAmount,
    0,
  )

  return {
    holdingAmount,
    costAmount: rows.reduce((sum, row) => sum + row.costAmount, 0),
    estimatedProfitAmount,
    estimatedChangePct:
      holdingAmount > 0 ? (estimatedProfitAmount / holdingAmount) * 100 : 0,
    dailyInvestAmount: rows.reduce(
      (sum, row) => sum + row.dailyInvestAmount,
      0,
    ),
    trackedFundCount: rows.length,
  }
}

function buildTopContributors(rows: FundEstimateRow[]) {
  return rows
    .flatMap((row) =>
      row.contributors.map((contributor) => ({
        name: contributor.name,
        symbol: contributor.symbol,
        market: contributor.market,
        relatedFund: row.fundName ?? row.fundCode,
        changePct: contributor.changePct,
        contributionPct: contributor.contributionPct,
      })),
    )
    .sort(
      (left, right) =>
        Math.abs(right.contributionPct) - Math.abs(left.contributionPct),
    )
    .slice(0, 5)
}

function dedupeFunds(funds: TrackedFund[]) {
  const deduped = new Map<string, TrackedFund>()

  for (const fund of funds) {
    deduped.set(fund.fund_code, fund)
  }

  return Array.from(deduped.values())
}
