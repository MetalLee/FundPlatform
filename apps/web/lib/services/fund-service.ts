import { createFundDataProvider } from "@/lib/providers/fund/provider-factory"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

import {
  estimateFundDailyChange,
  type FundDailyEstimate,
} from "./estimate-service"
import {
  getHoldingCoverage,
  getLatestHoldings,
  syncFundHoldings,
  type HoldingCoverage,
  type SyncFundHoldingsResult,
} from "./holding-service"
import { getQuotesForHoldings, syncQuotesForFund } from "./market-service"

type TrackedFundRow = Database["public"]["Tables"]["tracked_funds"]["Row"]
type FundHoldingRow = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuoteRow = Database["public"]["Tables"]["market_quotes"]["Row"]

export type AddTrackedFundResult = {
  fund: TrackedFundRow
  holdingsSync: SyncFundHoldingsResult
  quotes: MarketQuoteRow[]
  estimate: FundDailyEstimate
  warnings: string[]
}

export type FundDetail = {
  fund: TrackedFundRow | null
  holdings: FundHoldingRow[]
  quotes: MarketQuoteRow[]
  coverage: HoldingCoverage
  latestEstimate:
    | Database["public"]["Tables"]["estimate_snapshots"]["Row"]
    | null
}

export async function addTrackedFund(
  userId: string | null,
  fundCode: string,
): Promise<ApiResponse<AddTrackedFundResult>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const provider = createFundDataProvider()
    const basicInfo = await provider.getFundBasicInfo(normalizedFundCode)
    const fundResponse = await upsertTrackedFund(userId, basicInfo)

    if (!fundResponse.ok) {
      return fundResponse
    }

    const holdingsResponse = await syncFundHoldings(normalizedFundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    const quotesResponse = await syncQuotesForFund(normalizedFundCode)

    if (!quotesResponse.ok) {
      return quotesResponse
    }

    const estimateResponse = await estimateFundDailyChange(normalizedFundCode)

    if (!estimateResponse.ok) {
      return estimateResponse
    }

    return success({
      fund: fundResponse.data,
      holdingsSync: holdingsResponse.data,
      quotes: quotesResponse.data,
      estimate: estimateResponse.data,
      warnings: [
        ...holdingsResponse.data.warnings,
        ...estimateResponse.data.warnings,
      ],
    })
  } catch (error) {
    return toFailure("ADD_TRACKED_FUND_FAILED", error)
  }
}

export async function syncFund(fundCode: string): Promise<
  ApiResponse<{
    fund: TrackedFundRow
    holdingsSync: SyncFundHoldingsResult
    quotes: MarketQuoteRow[]
    estimate: FundDailyEstimate
  }>
> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const provider = createFundDataProvider()
    const basicInfo = await provider.getFundBasicInfo(normalizedFundCode)
    const fundResponse = await upsertTrackedFund(null, basicInfo)

    if (!fundResponse.ok) {
      return fundResponse
    }

    const holdingsResponse = await syncFundHoldings(normalizedFundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    const quotesResponse = await syncQuotesForFund(normalizedFundCode)

    if (!quotesResponse.ok) {
      return quotesResponse
    }

    const estimateResponse = await estimateFundDailyChange(normalizedFundCode)

    if (!estimateResponse.ok) {
      return estimateResponse
    }

    return success({
      fund: fundResponse.data,
      holdingsSync: holdingsResponse.data,
      quotes: quotesResponse.data,
      estimate: estimateResponse.data,
    })
  } catch (error) {
    return toFailure("SYNC_FUND_FAILED", error)
  }
}

export async function syncFundInfoAndHoldings(fundCode: string): Promise<
  ApiResponse<{
    fund: TrackedFundRow
    holdingsSync: SyncFundHoldingsResult
  }>
> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const provider = createFundDataProvider()
    const basicInfo = await provider.getFundBasicInfo(normalizedFundCode)
    const fundResponse = await upsertTrackedFund(null, basicInfo)

    if (!fundResponse.ok) {
      return fundResponse
    }

    const holdingsResponse = await syncFundHoldings(normalizedFundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    return success({
      fund: fundResponse.data,
      holdingsSync: holdingsResponse.data,
    })
  } catch (error) {
    return toFailure("SYNC_FUND_INFO_AND_HOLDINGS_FAILED", error)
  }
}

export async function getTrackedFunds(
  userId: string | null,
): Promise<ApiResponse<TrackedFundRow[]>> {
  try {
    const supabase = createSupabaseAdminClient()
    const query = supabase.from("tracked_funds").select().order("created_at")
    const { data, error } =
      userId === null
        ? await query.is("user_id", null)
        : await query.eq("user_id", userId)

    if (error) {
      return failure("SUPABASE_TRACKED_FUNDS_READ_FAILED", error.message, error)
    }

    return success(data ?? [])
  } catch (error) {
    return toFailure("GET_TRACKED_FUNDS_FAILED", error)
  }
}

export async function getFundDetail(
  userId: string | null,
  fundCode: string,
): Promise<ApiResponse<FundDetail>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const supabase = createSupabaseAdminClient()
    const fundQuery = supabase
      .from("tracked_funds")
      .select()
      .eq("fund_code", normalizedFundCode)
      .limit(1)

    const { data: fundData, error: fundError } =
      userId === null
        ? await fundQuery.is("user_id", null)
        : await fundQuery.eq("user_id", userId)

    if (fundError) {
      return failure(
        "SUPABASE_FUND_DETAIL_READ_FAILED",
        fundError.message,
        fundError,
      )
    }

    const holdingsResponse = await getLatestHoldings(normalizedFundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    const quotesResponse = await getQuotesForHoldings(holdingsResponse.data)

    if (!quotesResponse.ok) {
      return quotesResponse
    }

    const coverageResponse = await getHoldingCoverage(normalizedFundCode)

    if (!coverageResponse.ok) {
      return coverageResponse
    }

    const { data: estimateData, error: estimateError } = await supabase
      .from("estimate_snapshots")
      .select()
      .eq("fund_code", normalizedFundCode)
      .order("estimate_date", { ascending: false })
      .limit(1)

    if (estimateError) {
      return failure(
        "SUPABASE_ESTIMATE_READ_FAILED",
        estimateError.message,
        estimateError,
      )
    }

    return success({
      fund: fundData?.[0] ?? null,
      holdings: holdingsResponse.data,
      quotes: quotesResponse.data,
      coverage: coverageResponse.data,
      latestEstimate: estimateData?.[0] ?? null,
    })
  } catch (error) {
    return toFailure("GET_FUND_DETAIL_FAILED", error)
  }
}

async function upsertTrackedFund(
  userId: string | null,
  basicInfo: Awaited<
    ReturnType<ReturnType<typeof createFundDataProvider>["getFundBasicInfo"]>
  >,
): Promise<ApiResponse<TrackedFundRow>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("tracked_funds")
    .upsert(
      {
        user_id: userId,
        fund_code: basicInfo.fundCode,
        fund_name: basicInfo.fundName,
        fund_type: basicInfo.fundType ?? null,
        manager: basicInfo.manager ?? null,
        company: basicInfo.company ?? null,
        latest_nav: basicInfo.latestNav ?? null,
        latest_nav_date: basicInfo.latestNavDate ?? null,
        latest_nav_change_pct: basicInfo.latestNavChangePct ?? null,
        source: basicInfo.source,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,fund_code" },
    )
    .select()
    .single()

  if (error) {
    return failure("SUPABASE_TRACKED_FUND_UPSERT_FAILED", error.message, error)
  }

  return success(data)
}
