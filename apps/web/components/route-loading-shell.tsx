import { AppShell } from "@/components/app-shell"
import { LoadingState } from "@/components/loading-state"
import { RiskNotice } from "@/components/risk-notice"
import type { Locale } from "@/app/[lang]/dictionaries"
import { getShellLabels } from "@/app/[lang]/dictionaries"

type RouteLoadingShellProps = {
  lang?: Locale
  path: string
  title: string
  rows?: number
}

export function RouteLoadingShell({
  lang = "zh",
  path,
  title,
  rows = 6,
}: RouteLoadingShellProps) {
  return (
    <AppShell
      lang={lang}
      path={path}
      labels={getShellLabels(lang)}
      title={title}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <LoadingState rows={1} />
        <RiskNotice title={lang === "zh" ? "风险提示" : "Risk notice"} />
        <LoadingState rows={rows} />
      </div>
    </AppShell>
  )
}
