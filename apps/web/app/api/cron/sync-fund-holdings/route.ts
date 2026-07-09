import { ok, internalError } from "@/lib/api/route-response"
import { verifyCronAuthorization } from "@/lib/api/cron-auth"
import {
  getTrackedFunds,
  syncFundInfoAndHoldings,
} from "@/lib/services/fund-service"

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
      const syncResponse = await syncFundInfoAndHoldings(fund.fund_code)

      results.push({
        fundCode: fund.fund_code,
        holdingsSynced: syncResponse.ok
          ? syncResponse.data.holdingsSync.holdings.length
          : 0,
        ok: syncResponse.ok,
        error: syncResponse.ok ? null : syncResponse.error.code,
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
