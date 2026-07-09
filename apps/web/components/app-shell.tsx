import type { ReactNode } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"

import type { Locale } from "@/app/[lang]/dictionaries"
import { SidebarBrand, SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"

type AppShellProps = {
  lang: Locale
  path: string
  labels: {
    appName: string
    brandSubtitle: string
    mockData: string
    mockDataDescription: string
    estimatedWorkspace: string
    search: string
    notifications: string
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
  title,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r bg-muted/20 lg:flex lg:flex-col">
          <div className="p-4">
            <SidebarBrand
              lang={lang}
              appName={labels.appName}
              subtitle={labels.brandSubtitle}
            />
          </div>
          <Separator />
          <div className="flex-1 px-3 py-4">
            <SidebarNav lang={lang} labels={labels.nav} />
          </div>
          <div className="p-4">
            <div className="rounded-lg border bg-background p-3">
              <Badge variant="secondary">{labels.mockData}</Badge>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {labels.mockDataDescription}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <TopBar lang={lang} path={path} labels={labels} title={title} />
          <div className="border-b px-4 py-2 lg:hidden">
            <SidebarNav
              lang={lang}
              labels={labels.nav}
              className="flex-row overflow-x-auto pb-1"
            />
          </div>
          <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
