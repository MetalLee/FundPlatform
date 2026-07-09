import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AppShellFrame } from "@/components/app-shell-frame"

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

  return (
    <AppShellFrame lang={lang} labels={getShellLabels(lang)}>
      {children}
    </AppShellFrame>
  )
}
