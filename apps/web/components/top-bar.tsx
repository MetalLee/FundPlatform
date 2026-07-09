import { Bell, Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { LanguageSwitcher } from "@/app/[lang]/language-switcher"
import type { Locale } from "@/app/[lang]/dictionaries"

type TopBarProps = {
  lang: Locale
  path: string
  labels: {
    estimatedWorkspace: string
    search: string
    notifications: string
    language: string
    chinese: string
    english: string
  }
  title?: string
}

export function TopBar({
  lang,
  path,
  labels,
  title = "Fund Platform",
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          {labels.estimatedWorkspace}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label={labels.search}>
          <Search className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label={labels.notifications}>
          <Bell className="size-4" />
        </Button>
        <LanguageSwitcher
          currentLocale={lang}
          path={path}
          labels={{
            language: labels.language,
            chinese: labels.chinese,
            english: labels.english,
          }}
        />
      </div>
    </header>
  )
}
