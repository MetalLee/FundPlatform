import { Button } from "@workspace/ui/components/button"

import { AppShell } from "@/components/app-shell"
import { DataCard } from "@/components/data-card"
import { EmptyState } from "@/components/empty-state"
import { ChangeBadge } from "@/components/finance/change-badge"
import { MoneyText } from "@/components/finance/money-text"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

export default async function PortfolioPage({
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
      path="/portfolio"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.portfolio}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.portfolio.title}
          description={dict.portfolio.description}
          action={
            <Button variant="outline">{dict.portfolio.adjustView}</Button>
          }
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title={dict.portfolio.marketValue}
            value={<MoneyText value={128_430_000} compact />}
            description={dict.portfolio.marketValueDescription}
            trend={<ChangeBadge value={0.0128} />}
          />
          <MetricCard
            title={dict.portfolio.equityExposure}
            value="62%"
            description={dict.portfolio.equityExposureDescription}
          />
          <MetricCard
            title={dict.portfolio.fundCount}
            value="6"
            description={dict.portfolio.sampleData}
          />
        </section>

        <DataCard
          title={dict.portfolio.distributionTitle}
          description={dict.portfolio.distributionDescription}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {dict.portfolio.distribution.map(([label, value]) => (
              <div key={label} className="rounded-md border p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-2 text-2xl font-medium tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <EmptyState
          title={dict.portfolio.emptyTitle}
          description={dict.portfolio.emptyDescription}
        />
      </div>
    </AppShell>
  )
}
