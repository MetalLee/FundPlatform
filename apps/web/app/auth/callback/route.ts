import { NextResponse, type NextRequest } from "next/server"

import { getSafeNextPath } from "@/lib/auth/redirects"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const lang = next?.startsWith("/en/") ? "en" : "zh"
  const safeNext = getSafeNextPath(next, lang)

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(safeNext, request.url))
}
