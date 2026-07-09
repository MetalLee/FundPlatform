import { NextResponse } from "next/server"

import type {
  ApiFailure,
  ApiResponse as ServiceResponse,
} from "@/lib/utils/api-response"

export type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    detail?: unknown
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, { status })
}

export function badRequest(code: string, message: string, detail?: unknown) {
  return errorResponse(code, message, 400, detail)
}

export function internalError(error: unknown) {
  if (error instanceof Error) {
    return errorResponse("INTERNAL_SERVER_ERROR", error.message, 500)
  }

  return errorResponse("INTERNAL_SERVER_ERROR", "Unexpected API error", 500)
}

export function fromServiceResponse<T>(
  response: ServiceResponse<T>,
  successStatus = 200,
) {
  if (response.ok) {
    return ok(response.data, successStatus)
  }

  return serviceErrorResponse(response)
}

function serviceErrorResponse(response: ApiFailure) {
  const status = response.error.code.includes("VALIDATION") ? 400 : 500
  const isSupabaseError = response.error.code.startsWith("SUPABASE_")
  const message = isSupabaseError
    ? "Database operation failed"
    : response.error.message

  return errorResponse(response.error.code, message, status)
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  detail?: unknown,
) {
  return NextResponse.json<ApiResponse<never>>(
    {
      ok: false,
      error: {
        code,
        message,
        ...(detail === undefined ? {} : { detail }),
      },
    },
    { status },
  )
}
