import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { getCurrentUser } from "@/lib/auth/server"
import { getSafeNextPath } from "@/lib/auth/redirects"

import { getDictionary, hasLocale } from "../../dictionaries"

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    redirect("/zh/auth/login")
  }

  const { next } = await searchParams
  const safeNext = getSafeNextPath(next, lang)
  const user = await getCurrentUser()

  if (user) {
    redirect(safeNext)
  }

  const dict = getDictionary(lang)

  return (
    <main className="grid min-h-svh place-items-center bg-muted/20 px-4 py-8">
      <AuthForm lang={lang} mode="login" labels={dict.auth} />
    </main>
  )
}
