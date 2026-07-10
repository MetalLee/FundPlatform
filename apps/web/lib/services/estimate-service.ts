import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database, Json } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

import { getLatestHoldings } from "./holding-service"
import { getQuotesForHoldings } from "./market-service"
import { getUserPositions } from "./portfolio-service"
import { findQuoteForHolding } from "./quote-matcher"

type FundHoldingRow = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuoteRow = Database["public"]["Tables"]["market_quotes"]["Row"]
type EstimateSnapshotRow =
  Database["public"]["Tables"]["estimate_snapshots"]["Row"]

export type EstimateContributor = {
  market: string
  symbol: string
  name: string | null
  weightPct: number
  changePct: number
  contributionPct: number
}

export type FundDailyEstimate = {
  fundCode: string
  estimateDate: string
  estimatedChangePct: number
  coveredWeightPct: number
  estimatedProfitAmount: number | null
  topContributors: EstimateContributor[]
  warnings: string[]
  snapshot: EstimateSnapshotRow
}

export type UserPortfolioEstimate = {
  userId: string | null
  estimateDate: string
  estimatedProfitAmount: number
  funds: Array<{
    fundCode: string
    holdingAmount: number
    estimatedChangePct: number
    estimatedProfitAmount: number
    coveredWeightPct: number
    warnings: string[]
  }>
  warnings: string[]
}

const ESTIMATE_WARNINGS = [
  "估算基于公开披露持仓，可能滞后",
  "仅覆盖前十大或部分披露持仓",
  "未覆盖债券、现金、衍生品、基金经理调仓影响",
]

export async function estimateFundDailyChange(
  fundCode: string,
): Promise<ApiResponse<FundDailyEstimate>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const holdingsResponse = await getLatestHoldings(normalizedFundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    const quotesResponse = await getQuotesForHoldings(holdingsResponse.data)

    if (!quotesResponse.ok) {
      return quotesResponse
    }

    const estimateDate = getTodayDate()
    const contributors = calculateContributors(
      holdingsResponse.data,
      quotesResponse.data,
    )
    const estimatedChangePct = contributors.reduce(
      (sum, item) => sum + item.contributionPct,
      0,
    )
    const coveredWeightPct = contributors.reduce(
      (sum, item) => sum + item.weightPct,
      0,
    )
    const warnings = [...ESTIMATE_WARNINGS]
    const topContributors = contributors
      .sort(
        (left, right) =>
          Math.abs(right.contributionPct) - Math.abs(left.contributionPct),
      )
      .slice(0, 10)

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("estimate_snapshots")
      .upsert(
        {
          user_id: null,
          fund_code: normalizedFundCode,
          estimate_date: estimateDate,
          estimated_change_pct: estimatedChangePct,
          estimated_profit_amount: null,
          covered_weight_pct: coveredWeightPct,
          top_contributors: topContributors as unknown as Json,
          warnings: warnings as unknown as Json,
        },
        { onConflict: "user_id,fund_code,estimate_date" },
      )
      .select()
      .single()

    if (error) {
      return failure("SUPABASE_ESTIMATE_UPSERT_FAILED", error.message, error)
    }

    return success({
      fundCode: normalizedFundCode,
      estimateDate,
      estimatedChangePct,
      coveredWeightPct,
      estimatedProfitAmount: null,
      topContributors,
      warnings,
      snapshot: data,
    })
  } catch (error) {
    return toFailure("ESTIMATE_FUND_DAILY_CHANGE_FAILED", error)
  }
}

export async function estimateUserPortfolio(
  userId: string | null,
): Promise<ApiResponse<UserPortfolioEstimate>> {
  try {
    const positionsResponse = await getUserPositions(userId)

    if (!positionsResponse.ok) {
      return positionsResponse
    }

    const estimateDate = getTodayDate()
    const funds: UserPortfolioEstimate["funds"] = []
    const warnings = new Set<string>(ESTIMATE_WARNINGS)

    for (const position of positionsResponse.data) {
      const fundEstimateResponse = await estimateFundDailyChange(
        position.fund_code,
      )

      if (!fundEstimateResponse.ok) {
        return fundEstimateResponse
      }

      const holdingAmount = Number(position.holding_amount ?? 0)
      const estimatedProfitAmount =
        (holdingAmount * fundEstimateResponse.data.estimatedChangePct) / 100

      for (const warning of fundEstimateResponse.data.warnings) {
        warnings.add(warning)
      }

      await writeUserEstimateSnapshot({
        userId,
        fundCode: position.fund_code,
        estimateDate,
        estimatedChangePct: fundEstimateResponse.data.estimatedChangePct,
        estimatedProfitAmount,
        coveredWeightPct: fundEstimateResponse.data.coveredWeightPct,
        topContributors: fundEstimateResponse.data.topContributors,
        warnings: Array.from(warnings),
      })

      funds.push({
        fundCode: position.fund_code,
        holdingAmount,
        estimatedChangePct: fundEstimateResponse.data.estimatedChangePct,
        estimatedProfitAmount,
        coveredWeightPct: fundEstimateResponse.data.coveredWeightPct,
        warnings: fundEstimateResponse.data.warnings,
      })
    }

    return success({
      userId,
      estimateDate,
      estimatedProfitAmount: funds.reduce(
        (sum, fund) => sum + fund.estimatedProfitAmount,
        0,
      ),
      funds,
      warnings: Array.from(warnings),
    })
  } catch (error) {
    return toFailure("ESTIMATE_USER_PORTFOLIO_FAILED", error)
  }
}

async function writeUserEstimateSnapshot(input: {
  userId: string | null
  fundCode: string
  estimateDate: string
  estimatedChangePct: number
  estimatedProfitAmount: number
  coveredWeightPct: number
  topContributors: EstimateContributor[]
  warnings: string[]
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("estimate_snapshots").upsert(
    {
      user_id: input.userId,
      fund_code: input.fundCode,
      estimate_date: input.estimateDate,
      estimated_change_pct: input.estimatedChangePct,
      estimated_profit_amount: input.estimatedProfitAmount,
      covered_weight_pct: input.coveredWeightPct,
      top_contributors: input.topContributors as unknown as Json,
      warnings: input.warnings as unknown as Json,
    },
    { onConflict: "user_id,fund_code,estimate_date" },
  )

  if (error) {
    throw new Error(error.message)
  }
}

function calculateContributors(
  holdings: FundHoldingRow[],
  quotes: MarketQuoteRow[],
): EstimateContributor[] {
  return holdings
    .filter((holding) => holding.asset_type === "stock")
    .flatMap((holding) => {
      const quote = findQuoteForHolding(holding, quotes)
      const changePct = Number(quote?.change_pct ?? Number.NaN)

      if (!quote || !Number.isFinite(changePct)) {
        return []
      }

      const weightPct = Number(holding.weight_pct ?? 0)

      return [
        {
          market: quote.market,
          symbol: quote.symbol,
          name: holding.name ?? quote.name,
          weightPct,
          changePct,
          contributionPct: (weightPct * changePct) / 100,
        },
      ]
    })
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}
