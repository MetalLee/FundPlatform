import {
  badRequest,
  fromServiceResponse,
  internalError,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import {
  upsertUserPosition,
  type UpsertUserPositionInput,
} from "@/lib/services/portfolio-service"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

type PortfolioRequest = {
  fundCode?: unknown
  holdingAmount?: unknown
  holdingShares?: unknown
  costAmount?: unknown
  dailyInvestAmount?: unknown
  note?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PortfolioRequest

    if (typeof body.fundCode !== "string") {
      return badRequest("VALIDATION_ERROR", "fundCode is required")
    }

    const input: UpsertUserPositionInput = {
      fundCode: normalizeFundCode(body.fundCode),
      holdingAmount: parseOptionalNumber(body.holdingAmount, "holdingAmount"),
      holdingShares: parseOptionalNumber(body.holdingShares, "holdingShares"),
      costAmount: parseOptionalNumber(body.costAmount, "costAmount"),
      dailyInvestAmount: parseOptionalNumber(
        body.dailyInvestAmount,
        "dailyInvestAmount",
      ),
      note: typeof body.note === "string" ? body.note : null,
    }

    const userId = await getCurrentUserId()

    if (!userId) {
      return unauthorized()
    }

    return fromServiceResponse(await upsertUserPosition(userId, input))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON")
    }

    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    if (error instanceof Error && error.message.includes("must be a number")) {
      return badRequest("VALIDATION_ERROR", error.message)
    }

    return internalError(error)
  }
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
