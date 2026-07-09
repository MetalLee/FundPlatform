"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import type { Locale } from "@/app/[lang]/dictionaries"
import { AppShell } from "@/components/app-shell"

type AppShellFrameProps = {
  lang: Locale
  labels: Parameters<typeof AppShell>[0]["labels"]
  children: ReactNode
}

export function AppShellFrame({ lang, labels, children }: AppShellFrameProps) {
  const pathname = usePathname()
  const prefix = `/${lang}`
  const path = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length) || "/dashboard"
    : "/dashboard"

  return (
    <AppShell lang={lang} path={path} labels={labels}>
      {children}
    </AppShell>
  )
}
