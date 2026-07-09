import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const locales = ["zh", "en"]
const defaultLocale = "zh"
const protectedSegments = new Set([
  "dashboard",
  "funds",
  "portfolio",
  "insights",
  "settings",
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )

  if (!pathnameHasLocale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`

    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({ request })
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKey) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const [, lang, segment] = pathname.split("/")
    const requiresAuth = protectedSegments.has(segment ?? "")

    if (requiresAuth && (!user || !user.email_confirmed_at)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${lang}/auth/login`
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`)

      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
