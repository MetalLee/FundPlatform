import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import {
  PortfolioSummary,
  type PortfolioFundItem,
} from "@/components/portfolio-summary"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"
import { estimateFundDailyChange } from "@/lib/services/estimate-service"
import { getTrackedFunds } from "@/lib/services/fund-service"
import { getUserPositions } from "@/lib/services/portfolio-service"
import type { Database } from "@/lib/supabase/types"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

type TrackedFund = Database["public"]["Tables"]["tracked_funds"]["Row"]
type UserPosition = Database["public"]["Tables"]["user_positions"]["Row"]

export const dynamic = "force-dynamic"

export default async function PortfolioPage({
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

  const hasLoadError = !fundsResponse.ok || !positionsResponse.ok
  const funds = fundsResponse.ok ? dedupeFunds(fundsResponse.data) : []
  const positions = positionsResponse.ok ? positionsResponse.data : []
  const items = hasLoadError
    ? []
    : await buildPortfolioItems(funds, positions)

  return (
    <AppShell
      lang={lang}
      path="/portfolio"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.portfolio}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.portfolio.title}
          description={dict.portfolio.description}
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        {hasLoadError ? (
          <ErrorState
            title={dict.portfolio.loadErrorTitle}
            description={dict.portfolio.loadErrorDescription}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={dict.portfolio.emptyTitle}
            description={dict.portfolio.emptyDescription}
          />
        ) : (
          <PortfolioSummary items={items} labels={dict.portfolio} />
        )}
      </div>
    </AppShell>
  )
}

async function buildPortfolioItems(
  funds: TrackedFund[],
  positions: UserPosition[],
): Promise<PortfolioFundItem[]> {
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
        fundType: fund.fund_type,
        position: {
          holdingAmount,
          holdingShares: Number(position?.holding_shares ?? 0),
          costAmount: Number(position?.cost_amount ?? 0),
          dailyInvestAmount: Number(position?.daily_invest_amount ?? 0),
          note: position?.note ?? null,
        },
        estimate: {
          estimatedChangePct,
          estimatedProfitAmount: (holdingAmount * estimatedChangePct) / 100,
        },
      }
    }),
  )
}

function dedupeFunds(funds: TrackedFund[]) {
  const deduped = new Map<string, TrackedFund>()

  for (const fund of funds) {
    deduped.set(fund.fund_code, fund)
  }

  return Array.from(deduped.values())
}
