import type { ReactNode } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"

import type { Locale } from "@/app/[lang]/dictionaries"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"

type AppShellProps = {
  lang: Locale
  path: string
  labels: {
    appName: string
    brandSubtitle: string
    mockData: string
    mockDataDescription: string
    search: string
    notifications: string
    signOut: string
    language: string
    chinese: string
    english: string
    nav: {
      dashboard: string
      funds: string
      portfolio: string
      insights: string
      settings: string
    }
  }
  title?: string
  children: ReactNode
}

export function AppShell({
  lang,
  path,
  labels,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <TopBar lang={lang} path={path} labels={labels} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden min-h-0 border-r bg-muted/20 lg:flex lg:flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-3 py-4">
              <SidebarNav lang={lang} labels={labels.nav} />
            </div>
          </ScrollArea>
          <Separator />
          <div className="p-4">
            <div className="rounded-lg border bg-background p-3">
              <Badge variant="secondary">{labels.mockData}</Badge>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {labels.mockDataDescription}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 border-b px-4 py-2 lg:hidden">
            <SidebarNav
              lang={lang}
              labels={labels.nav}
              className="scrollbar-subtle flex-row overflow-x-auto pb-1"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <main className="scrollbar-subtle px-4 py-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 lg:px-6">
              {children}
            </main>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
