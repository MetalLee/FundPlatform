import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"
import { createFundDataProvider } from "@/lib/providers/fund/provider-factory"

type FundHoldingRow = Database["public"]["Tables"]["fund_holdings"]["Row"]

export type HoldingCoverage = {
  fundCode: string
  coveredWeightPct: number
  warnings: string[]
}

export type SyncFundHoldingsResult = {
  fundCode: string
  holdings: FundHoldingRow[]
  coveredWeightPct: number
  warnings: string[]
}

const LOW_COVERAGE_WARNING = "Holding coverage is below 30%"

export async function syncFundHoldings(
  fundCode: string,
): Promise<ApiResponse<SyncFundHoldingsResult>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const provider = createFundDataProvider()
    const providerHoldings = await provider.getFundHoldings(normalizedFundCode)
    const supabase = createSupabaseAdminClient()

    const rows = providerHoldings.map((holding) => ({
      fund_code: holding.fundCode,
      report_period: holding.reportPeriod,
      asset_type: holding.assetType,
      market: holding.market,
      symbol: holding.symbol,
      name: holding.name,
      weight_pct: holding.weightPct,
      shares: holding.shares ?? null,
      market_value: holding.marketValue ?? null,
      source: holding.source,
      source_report_date: holding.sourceReportDate ?? null,
    }))

    const { data, error } = await supabase
      .from("fund_holdings")
      .upsert(rows, { onConflict: "fund_code,report_period,symbol" })
      .select()

    if (error) {
      return failure("SUPABASE_HOLDINGS_UPSERT_FAILED", error.message, error)
    }

    const coveredWeightPct = calculateCoveredWeightPct(data ?? [])
    const warnings = coveredWeightPct < 30 ? [LOW_COVERAGE_WARNING] : []

    return success({
      fundCode: normalizedFundCode,
      holdings: data ?? [],
      coveredWeightPct,
      warnings,
    })
  } catch (error) {
    return toFailure("SYNC_FUND_HOLDINGS_FAILED", error)
  }
}

export async function getLatestHoldings(
  fundCode: string,
): Promise<ApiResponse<FundHoldingRow[]>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const supabase = createSupabaseAdminClient()

    const { data: latestRows, error: latestError } = await supabase
      .from("fund_holdings")
      .select("report_period")
      .eq("fund_code", normalizedFundCode)
      .order("report_period", { ascending: false })
      .limit(1)

    if (latestError) {
      return failure(
        "SUPABASE_HOLDINGS_READ_FAILED",
        latestError.message,
        latestError,
      )
    }

    const latestReportPeriod = latestRows?.[0]?.report_period

    if (!latestReportPeriod) {
      return success([])
    }

    const { data, error } = await supabase
      .from("fund_holdings")
      .select()
      .eq("fund_code", normalizedFundCode)
      .eq("report_period", latestReportPeriod)
      .order("weight_pct", { ascending: false })

    if (error) {
      return failure("SUPABASE_HOLDINGS_READ_FAILED", error.message, error)
    }

    return success(data ?? [])
  } catch (error) {
    return toFailure("GET_LATEST_HOLDINGS_FAILED", error)
  }
}

export async function getHoldingCoverage(
  fundCode: string,
): Promise<ApiResponse<HoldingCoverage>> {
  const holdingsResponse = await getLatestHoldings(fundCode)

  if (!holdingsResponse.ok) {
    return holdingsResponse
  }

  const normalizedFundCode = normalizeFundCode(fundCode)
  const coveredWeightPct = calculateCoveredWeightPct(holdingsResponse.data)

  return success({
    fundCode: normalizedFundCode,
    coveredWeightPct,
    warnings: coveredWeightPct < 30 ? [LOW_COVERAGE_WARNING] : [],
  })
}

function calculateCoveredWeightPct(
  holdings: Array<{ weight_pct: number | null }>,
) {
  return holdings.reduce(
    (sum, holding) => sum + Number(holding.weight_pct ?? 0),
    0,
  )
}
