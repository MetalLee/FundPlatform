import { NextResponse } from "next/server"

import type { ApiResponse } from "./route-response"

export function verifyCronAuthorization(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized cron request",
        },
      },
      { status: 401 },
    )
  }

  return null
}
