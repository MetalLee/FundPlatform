import {
  badRequest,
  fromServiceResponse,
  internalError,
} from "@/lib/api/route-response"
import {
  createInsightSource,
  type CreateInsightSourceInput,
} from "@/lib/services/insight-service"

type InsightSourceRequest = {
  title?: unknown
  sourceType?: unknown
  url?: unknown
  content?: unknown
  relatedMarkets?: unknown
  relatedSymbols?: unknown
  relatedFundCodes?: unknown
  sentiment?: unknown
  importance?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InsightSourceRequest

    if (typeof body.title !== "string") {
      return badRequest("VALIDATION_ERROR", "title is required")
    }

    if (typeof body.sourceType !== "string") {
      return badRequest("VALIDATION_ERROR", "sourceType is required")
    }

    const input: CreateInsightSourceInput = {
      title: body.title,
      sourceType: body.sourceType,
      url: typeof body.url === "string" ? body.url : null,
      content: typeof body.content === "string" ? body.content : null,
      relatedMarkets: parseOptionalStringArray(
        body.relatedMarkets,
        "relatedMarkets",
      ),
      relatedSymbols: parseOptionalStringArray(
        body.relatedSymbols,
        "relatedSymbols",
      ),
      relatedFundCodes: parseOptionalStringArray(
        body.relatedFundCodes,
        "relatedFundCodes",
      ),
      sentiment: typeof body.sentiment === "string" ? body.sentiment : null,
      importance: parseOptionalNumber(body.importance, "importance"),
    }

    return fromServiceResponse(await createInsightSource(null, input), 201)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON")
    }

    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    if (
      error instanceof Error &&
      (error.message.includes("must be an array") ||
        error.message.includes("must be a number"))
    ) {
      return badRequest("VALIDATION_ERROR", error.message)
    }

    return internalError(error)
  }
}

function parseOptionalStringArray(value: unknown, field: string) {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`)
  }

  return value
}

function parseOptionalNumber(value: unknown, field: string) {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a number`)
  }

  return value
}
