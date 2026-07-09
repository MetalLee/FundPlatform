import {
  fromServiceResponse,
  internalError,
  badRequest,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import { syncFund } from "@/lib/services/fund-service"
import { normalizeFundCode } from "@/lib/utils/code-normalizer"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fundCode: string }> },
) {
  try {
    const { fundCode } = await params
    const userId = await getCurrentUserId()

    if (!userId) {
      return unauthorized()
    }

    const result = await syncFund(normalizeFundCode(fundCode), userId)

    return fromServiceResponse(result)
  } catch (error) {
    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    return internalError(error)
  }
}
