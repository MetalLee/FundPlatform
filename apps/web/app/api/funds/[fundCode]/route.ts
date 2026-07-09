import {
  badRequest,
  fromServiceResponse,
  internalError,
  unauthorized,
} from "@/lib/api/route-response"
import { getCurrentUserId } from "@/lib/auth/server"
import { getFundDetail } from "@/lib/services/fund-service"
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

    const result = await getFundDetail(userId, normalizeFundCode(fundCode))

    return fromServiceResponse(result)
  } catch (error) {
    if (error instanceof Error && error.message.includes("Fund code")) {
      return badRequest("INVALID_FUND_CODE", error.message)
    }

    return internalError(error)
  }
}
