import {
  badRequest,
  fromServiceResponse,
  internalError,
  ok,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import {
  getHoldingCoverage,
  getLatestHoldings,
} from "@/lib/services/holding-service"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fundCode: string }> },
) {
  try {
    const { fundCode } = await params
    const userId = await getCurrentUserId()

    if (!userId) {
      return unauthorized()
    }

    const normalizedFundCode = normalizeFundCode(fundCode)
    const holdingsResult = await getLatestHoldings(normalizedFundCode)

    if (!holdingsResult.ok) {
      return fromServiceResponse(holdingsResult)
    }

    const coverageResult = await getHoldingCoverage(normalizedFundCode)

    if (!coverageResult.ok) {
      return fromServiceResponse(coverageResult)
    }

    const holdings = holdingsResult.data
    const reportPeriod = holdings[0]?.report_period ?? null
    const sources = Array.from(
      new Set(holdings.map((holding) => holding.source).filter(Boolean)),
    )
    const lastUpdatedAt =
      holdings
        .map((holding) => holding.updated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null

    return ok({
      fundCode: normalizedFundCode,
      holdings,
      coveredWeightPct: coverageResult.data.coveredWeightPct,
      warnings: coverageResult.data.warnings,
      reportPeriod,
      sources,
      lastUpdatedAt,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    return internalError(error)
  }
}
