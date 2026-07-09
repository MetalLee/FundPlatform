import { ok, internalError } from "@/lib/api/route-response"
import { verifyCronAuthorization } from "@/lib/api/cron-auth"
import { estimateFundDailyChange } from "@/lib/services/estimate-service"
import { getTrackedFunds } from "@/lib/services/fund-service"
import { syncQuotesForFund } from "@/lib/services/market-service"

export async function GET(request: Request) {
  const unauthorized = verifyCronAuthorization(request)

  if (unauthorized) {
    return unauthorized
  }

  try {
    const fundsResponse = await getTrackedFunds(null)

    if (!fundsResponse.ok) {
      return internalError(new Error(fundsResponse.error.message))
    }

    const results = []

    for (const fund of dedupeFunds(fundsResponse.data)) {
      const quotesResponse = await syncQuotesForFund(fund.fund_code)
      const estimateResponse = quotesResponse.ok
        ? await estimateFundDailyChange(fund.fund_code)
        : null

      results.push({
        fundCode: fund.fund_code,
        quotesSynced: quotesResponse.ok ? quotesResponse.data.length : 0,
        estimateCreated: Boolean(estimateResponse?.ok),
        ok: quotesResponse.ok && Boolean(estimateResponse?.ok),
        error: !quotesResponse.ok
          ? quotesResponse.error.code
          : estimateResponse && !estimateResponse.ok
            ? estimateResponse.error.code
            : null,
      })
    }

    return ok({
      syncedAt: new Date().toISOString(),
      fundCount: results.length,
      results,
    })
  } catch (error) {
    return internalError(error)
  }
}

function dedupeFunds<T extends { fund_code: string }>(funds: T[]) {
  const deduped = new Map<string, T>()

  for (const fund of funds) {
    deduped.set(fund.fund_code, fund)
  }

  return Array.from(deduped.values())
}
