import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import type { Locale } from "./dictionaries"

type LanguageSwitcherProps = {
  currentLocale: Locale
  path: string
  labels: {
    language: string
    chinese: string
    english: string
  }
}

export function LanguageSwitcher({
  currentLocale,
  path,
  labels,
}: LanguageSwitcherProps) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return (
    <div
      aria-label={labels.language}
      className="flex items-center gap-1 rounded-md border bg-background p-0.5"
    >
      {[
        { locale: "zh" as const, label: labels.chinese },
        { locale: "en" as const, label: labels.english },
      ].map((item) => (
        <Button
          key={item.locale}
          nativeButton={false}
          size="sm"
          variant={item.locale === currentLocale ? "secondary" : "ghost"}
          render={<Link href={`/${item.locale}${normalizedPath}`} />}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
