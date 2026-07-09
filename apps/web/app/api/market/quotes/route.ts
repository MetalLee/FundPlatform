import {
  badRequest,
  fromServiceResponse,
  internalError,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import {
  getCachedQuotesForSymbols,
  type QuoteRequestItem,
} from "@/lib/services/market-service"

type QuotesRequest = {
  items?: unknown
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return unauthorized()
    }

    const body = (await request.json()) as QuotesRequest

    if (!Array.isArray(body.items)) {
      return badRequest("VALIDATION_ERROR", "items must be an array")
    }

    const items: QuoteRequestItem[] = []

    for (const item of body.items) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { market?: unknown }).market !== "string" ||
        typeof (item as { symbol?: unknown }).symbol !== "string"
      ) {
        return badRequest(
          "VALIDATION_ERROR",
          "each item must include market and symbol strings",
        )
      }

      items.push({
        market: (item as { market: string }).market,
        symbol: (item as { symbol: string }).symbol,
      })
    }

    return fromServiceResponse(await getCachedQuotesForSymbols(items))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON")
    }

    return internalError(error)
  }
}
