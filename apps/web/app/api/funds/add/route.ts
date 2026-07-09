import { addTrackedFund } from "@/lib/services/fund-service"
import {
  badRequest,
  fromServiceResponse,
  internalError,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

type AddFundRequest = {
  fundCode?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddFundRequest

    if (typeof body.fundCode !== "string") {
      return badRequest("VALIDATION_ERROR", "fundCode is required")
    }

    const fundCode = normalizeFundCode(body.fundCode)
    const userId = await getCurrentUserId()

    if (!userId) {
      return unauthorized()
    }

    const result = await addTrackedFund(userId, fundCode)

    return fromServiceResponse(result, 201)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON")
    }

    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    return internalError(error)
  }
}
