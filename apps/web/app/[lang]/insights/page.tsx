import { Button } from "@workspace/ui/components/button"

import { AppShell } from "@/components/app-shell"
import { DataCard } from "@/components/data-card"
import { ErrorState } from "@/components/error-state"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)

  return (
    <AppShell
      lang={lang}
      path="/insights"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.insights}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.insights.title}
          description={dict.insights.description}
          action={<Button>{dict.insights.generateSummary}</Button>}
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <DataCard
            title={dict.insights.industryTitle}
            description={dict.insights.industryDescription}
          >
            <div className="space-y-3">
              {dict.insights.industries.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{item}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {[38, 27, 18][index]}%
                  </span>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard
            title={dict.insights.loadingTitle}
            description={dict.insights.loadingDescription}
          >
            <LoadingState rows={3} />
          </DataCard>
        </section>

        <ErrorState
          title={dict.insights.errorTitle}
          description={dict.insights.errorDescription}
        />
      </div>
    </AppShell>
  )
}
