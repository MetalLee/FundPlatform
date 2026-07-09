import { Bell, Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { LanguageSwitcher } from "@/app/[lang]/language-switcher"
import type { Locale } from "@/app/[lang]/dictionaries"
import { SidebarBrand } from "@/components/sidebar-nav"

type TopBarProps = {
  lang: Locale
  path: string
  labels: {
    appName: string
    brandSubtitle: string
    search: string
    notifications: string
    language: string
    chinese: string
    english: string
  }
}

export function TopBar({ lang, path, labels }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <SidebarBrand
        lang={lang}
        appName={labels.appName}
        subtitle={labels.brandSubtitle}
      />
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
