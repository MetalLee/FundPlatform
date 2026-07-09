import { createFundDataProvider } from "@/lib/providers/fund/provider-factory"
import { dispatchFundSyncWorkflow } from "@/lib/github/workflow-dispatch"
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
  getHoldingCoverage,
  getLatestHoldings,
  type HoldingCoverage,
} from "./holding-service"
import { getQuotesForHoldings } from "./market-service"

type TrackedFundRow = Database["public"]["Tables"]["tracked_funds"]["Row"]
type UserTrackedFundRow =
  Database["public"]["Tables"]["user_tracked_funds"]["Row"]
type FundRow = Database["public"]["Tables"]["funds"]["Row"]
type FundNavRow = Database["public"]["Tables"]["fund_navs"]["Row"]
type FundHoldingRow = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuoteRow = Database["public"]["Tables"]["market_quotes"]["Row"]
type DataSyncLogRow = Database["public"]["Tables"]["data_sync_logs"]["Row"]

export type FreshnessWarningCode =
  | "data_missing"
  | "quote_stale"
  | "holding_stale"
  | "low_coverage"
  | "worker_failed"
  | "worker_stale"

export type AddTrackedFundResult = {
  trackedFund: UserTrackedFundRow
  fund: TrackedFundRow
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
  dataStaleWarning: "data_missing" | "data_stale" | null
  freshnessWarnings: FreshnessWarningCode[]
}

const STALE_DATA_MS = 1000 * 60 * 60 * 24 * 3
const QUOTE_STALE_MS = 1000 * 60 * 60 * 24 * 3
const HOLDING_STALE_MS = 1000 * 60 * 60 * 24 * 120
const WORKER_STALE_MS = 1000 * 60 * 60 * 24 * 7
const LOW_COVERAGE_THRESHOLD_PCT = 30

export function buildPendingFundUpsert(fundCode: string, now = new Date()) {
  return {
    fund_code: normalizeFundCode(fundCode),
    sync_status: "pending" as const,
    sync_requested_at: now.toISOString(),
  }
}

export function normalizeFreshnessWarning(
  lastSyncedAt: string | null | undefined,
  now = new Date(),
) {
  if (!lastSyncedAt) {
    return "data_missing" as const
  }

  const syncedAt = new Date(lastSyncedAt).getTime()

  if (!Number.isFinite(syncedAt)) {
    return "data_missing" as const
  }

  return now.getTime() - syncedAt > STALE_DATA_MS
    ? ("data_stale" as const)
    : null
}

export function buildFreshnessWarnings({
  quoteTimes,
  holdingReportDates,
  coveredWeightPct,
  latestSyncLog,
  now = new Date(),
}: {
  quoteTimes: Array<string | null | undefined>
  holdingReportDates: Array<string | null | undefined>
  coveredWeightPct: number
  latestSyncLog?: Pick<DataSyncLogRow, "status" | "created_at"> | null
  now?: Date
}): FreshnessWarningCode[] {
  const warnings = new Set<FreshnessWarningCode>()
  const newestQuoteTime = newestTimestamp(quoteTimes)
  const newestHoldingTime = newestTimestamp(holdingReportDates)
  const newestWorkerTime = parseTimestamp(latestSyncLog?.created_at)
  const nowTime = now.getTime()

  if (quoteTimes.length === 0) {
    warnings.add("data_missing")
  } else if (!newestQuoteTime || nowTime - newestQuoteTime > QUOTE_STALE_MS) {
    warnings.add("quote_stale")
  }

  if (holdingReportDates.length === 0) {
    warnings.add("data_missing")
  } else if (
    !newestHoldingTime ||
    nowTime - newestHoldingTime > HOLDING_STALE_MS
  ) {
    warnings.add("holding_stale")
  }

  if (coveredWeightPct < LOW_COVERAGE_THRESHOLD_PCT) {
    warnings.add("low_coverage")
  }

  if (latestSyncLog?.status === "failed") {
    warnings.add("worker_failed")
  }

  if (!newestWorkerTime || nowTime - newestWorkerTime > WORKER_STALE_MS) {
    warnings.add("worker_stale")
  }

  return Array.from(warnings)
}

export async function addTrackedFund(
  userId: string | null,
  fundCode: string,
): Promise<ApiResponse<AddTrackedFundResult>> {
  try {
    if (!userId) {
      return failure("AUTH_REQUIRED", "User is required")
    }

    const normalizedFundCode = normalizeFundCode(fundCode)
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("user_tracked_funds")
      .upsert(
        {
          user_id: userId,
          fund_code: normalizedFundCode,
          is_active: true,
        },
        { onConflict: "user_id,fund_code" },
      )
      .select()
      .single()

    if (error) {
      return failure("SUPABASE_USER_TRACKED_FUND_UPSERT_FAILED", error.message, error)
    }

    const { error: fundError } = await supabase
      .from("funds")
      .upsert(buildPendingFundUpsert(normalizedFundCode), {
        onConflict: "fund_code",
      })

    if (fundError) {
      return failure("SUPABASE_PENDING_FUND_UPSERT_FAILED", fundError.message, fundError)
    }

    const dispatchResponse = await dispatchFundSyncWorkflow({
      task: "sync-all",
      fundCode: normalizedFundCode,
    })

    const detailResponse = await getFundDetail(userId, normalizedFundCode)

    if (!detailResponse.ok) {
      return detailResponse
    }

    return success({
      trackedFund: data,
      fund: detailResponse.data.fund ?? createPlaceholderFund(normalizedFundCode, userId),
      warnings: [
        ...detailResponse.data.freshnessWarnings,
        ...(dispatchResponse.ok ? [] : [dispatchResponse.error.code]),
      ],
    })
  } catch (error) {
    return toFailure("ADD_TRACKED_FUND_FAILED", error)
  }
}

export async function syncFund(
  fundCode: string,
  userId: string | null = null,
): Promise<ApiResponse<FundDetail>> {
  return getFundDetail(userId, fundCode)
}

export async function syncFundInfoAndHoldings(
  fundCode: string,
): Promise<ApiResponse<FundDetail>> {
  return getFundDetail(null, fundCode)
}

export async function getTrackedFunds(
  userId: string | null,
): Promise<ApiResponse<TrackedFundRow[]>> {
  try {
    if (!userId) {
      return getSharedTrackedFunds()
    }

    const supabase = createSupabaseAdminClient()
    const { data: trackedRows, error } = await supabase
      .from("user_tracked_funds")
      .select()
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at")

    if (error) {
      return failure("SUPABASE_TRACKED_FUNDS_READ_FAILED", error.message, error)
    }

    const funds = await Promise.all(
      (trackedRows ?? []).map(async (tracked) => {
        const fundResponse = await getCachedFundView(tracked.fund_code, userId)
        return fundResponse.ok
          ? fundResponse.data
          : createPlaceholderFund(tracked.fund_code, userId)
      }),
    )

    return success(funds)
  } catch (error) {
    return toFailure("GET_TRACKED_FUNDS_FAILED", error)
  }
}

export async function getSharedTrackedFunds(): Promise<
  ApiResponse<TrackedFundRow[]>
> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("funds").select().order("fund_code")

    if (error) {
      return failure("SUPABASE_SHARED_FUNDS_READ_FAILED", error.message, error)
    }

    const funds = await Promise.all(
      (data ?? []).map((fund) => buildTrackedFundView(fund, null, null)),
    )

    return success(funds)
  } catch (error) {
    return toFailure("GET_SHARED_TRACKED_FUNDS_FAILED", error)
  }
}

export async function getFundDetail(
  userId: string | null,
  fundCode: string,
): Promise<ApiResponse<FundDetail>> {
  try {
    const normalizedFundCode = normalizeFundCode(fundCode)
    const fundResponse = await getCachedFundView(normalizedFundCode, userId)

    if (!fundResponse.ok) {
      return fundResponse
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

    const supabase = createSupabaseAdminClient()
    const latestSyncLog = await getLatestDataSyncLog(supabase)
    const estimateQuery = supabase
      .from("estimate_snapshots")
      .select()
      .eq("fund_code", normalizedFundCode)
      .order("estimate_date", { ascending: false })
      .limit(1)
    const { data: estimateData, error: estimateError } =
      userId === null
        ? await estimateQuery.is("user_id", null)
        : await estimateQuery.eq("user_id", userId)

    if (estimateError) {
      return failure(
        "SUPABASE_ESTIMATE_READ_FAILED",
        estimateError.message,
        estimateError,
      )
    }

    let latestEstimate = estimateData?.[0] ?? null

    if (!latestEstimate && userId !== null) {
      const { data: sharedEstimateData, error: sharedEstimateError } =
        await supabase
          .from("estimate_snapshots")
          .select()
          .eq("fund_code", normalizedFundCode)
          .is("user_id", null)
          .order("estimate_date", { ascending: false })
          .limit(1)

      if (sharedEstimateError) {
        return failure(
          "SUPABASE_ESTIMATE_READ_FAILED",
          sharedEstimateError.message,
          sharedEstimateError,
        )
      }

      latestEstimate = sharedEstimateData?.[0] ?? null
    }

    const latestSync = [
      fundResponse.data.last_synced_at,
      ...holdingsResponse.data.map((holding) => holding.last_synced_at),
      ...quotesResponse.data.map((quote) => quote.last_synced_at ?? quote.quote_time),
    ].filter(Boolean).sort().at(-1)

    return success({
      fund: fundResponse.data,
      holdings: holdingsResponse.data,
      quotes: quotesResponse.data,
      coverage: coverageResponse.data,
      latestEstimate,
      dataStaleWarning: normalizeFreshnessWarning(latestSync),
      freshnessWarnings: buildFreshnessWarnings({
        quoteTimes: quotesResponse.data.map(
          (quote) => quote.last_synced_at ?? quote.quote_time,
        ),
        holdingReportDates: holdingsResponse.data.map(
          (holding) => holding.source_report_date ?? holding.last_synced_at,
        ),
        coveredWeightPct: coverageResponse.data.coveredWeightPct,
        latestSyncLog,
      }),
    })
  } catch (error) {
    return toFailure("GET_FUND_DETAIL_FAILED", error)
  }
}

async function getLatestDataSyncLog(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const { data } = await supabase
    .from("data_sync_logs")
    .select("status,created_at")
    .order("created_at", { ascending: false })
    .limit(1)

  return data?.[0] ?? null
}

async function getCachedFundView(
  fundCode: string,
  userId: string | null,
): Promise<ApiResponse<TrackedFundRow>> {
  const supabase = createSupabaseAdminClient()
  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select()
    .eq("fund_code", fundCode)
    .maybeSingle()

  if (fundError) {
    return failure("SUPABASE_FUND_READ_FAILED", fundError.message, fundError)
  }

  if (!fund && shouldUseMockData()) {
    return getMockFundView(fundCode, userId)
  }

  if (!fund) {
    return success(createPlaceholderFund(fundCode, userId))
  }

  return success(await buildTrackedFundView(fund, userId, null))
}

async function buildTrackedFundView(
  fund: FundRow,
  userId: string | null,
  nav: FundNavRow | null,
): Promise<TrackedFundRow> {
  const latestNav = nav ?? (await getLatestNav(fund.fund_code))

  return {
    id: fund.fund_code,
    user_id: userId,
    fund_code: fund.fund_code,
    fund_name: fund.fund_name,
    fund_type: fund.fund_type,
    manager: fund.manager,
    company: fund.company,
    latest_nav: latestNav?.nav ?? null,
    latest_nav_date: latestNav?.nav_date ?? null,
    latest_nav_change_pct: latestNav?.nav_change_pct ?? null,
    source: fund.data_source,
    last_synced_at: fund.last_synced_at ?? latestNav?.last_synced_at ?? null,
    created_at: fund.created_at,
    updated_at: fund.updated_at,
  }
}

async function getLatestNav(fundCode: string) {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("fund_navs")
    .select()
    .eq("fund_code", fundCode)
    .order("nav_date", { ascending: false })
    .limit(1)

  return data?.[0] ?? null
}

async function getMockFundView(
  fundCode: string,
  userId: string | null,
): Promise<ApiResponse<TrackedFundRow>> {
  try {
    const provider = createFundDataProvider()
    const basicInfo = await provider.getFundBasicInfo(fundCode)

    return success({
      id: fundCode,
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
      created_at: null,
      updated_at: null,
    })
  } catch {
    return success(createPlaceholderFund(fundCode, userId))
  }
}

function createPlaceholderFund(
  fundCode: string,
  userId: string | null,
): TrackedFundRow {
  return {
    id: fundCode,
    user_id: userId,
    fund_code: fundCode,
    fund_name: null,
    fund_type: null,
    manager: null,
    company: null,
    latest_nav: null,
    latest_nav_date: null,
    latest_nav_change_pct: null,
    source: null,
    last_synced_at: null,
    created_at: null,
    updated_at: null,
  }
}

function shouldUseMockData() {
  return process.env.USE_MOCK_DATA !== "false"
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map(parseTimestamp)
    .filter((value): value is number => value !== null)

  return timestamps.length === 0 ? null : Math.max(...timestamps)
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()

  return Number.isFinite(timestamp) ? timestamp : null
}
