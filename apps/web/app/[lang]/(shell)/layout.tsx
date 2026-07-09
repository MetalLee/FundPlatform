import { notFound } from "next/navigation"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { AppShellFrame } from "@/components/app-shell-frame"
import { getCurrentUser } from "@/lib/auth/server"
import { buildAuthRedirectPath } from "@/lib/auth/redirects"

import { getShellLabels, hasLocale } from "../dictionaries"

export default async function ShellLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect(buildAuthRedirectPath(lang, `/${lang}/dashboard`))
  }

  return (
    <AppShellFrame lang={lang} labels={getShellLabels(lang)}>
      {children}
    </AppShellFrame>
  )
}
