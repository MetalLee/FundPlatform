import { NextResponse, type NextRequest } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "zh"
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(`/${lang}/auth/login`, request.url), 303)
}

export function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "zh"

  return NextResponse.redirect(new URL(`/${lang}/auth/login`, request.url))
}
