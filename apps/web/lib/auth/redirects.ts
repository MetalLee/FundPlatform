import type { Locale } from "@/app/[lang]/dictionaries"

const protectedSegments = new Set([
  "dashboard",
  "funds",
  "portfolio",
  "insights",
  "settings",
])

export function isProtectedAppPath(pathname: string) {
  const [, locale, segment] = pathname.split("/")

  return (
    (locale === "zh" || locale === "en") &&
    protectedSegments.has(segment ?? "")
  )
}

export function buildAuthRedirectPath(lang: Locale, nextPath: string) {
  return `/${lang}/auth/login?next=${encodeURIComponent(nextPath)}`
}

export function getSafeNextPath(value: string | null | undefined, lang: Locale) {
  const fallback = `/${lang}/dashboard`

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback
  }

  try {
    const url = new URL(value, "http://local.test")

    if (url.origin !== "http://local.test") {
      return fallback
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
