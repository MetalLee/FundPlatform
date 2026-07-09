import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { AppShell } from "@/components/app-shell"
import { DataCard } from "@/components/data-card"
import { EmptyState } from "@/components/empty-state"
import { ChangeBadge } from "@/components/finance/change-badge"
import { LastUpdatedText } from "@/components/finance/last-updated-text"
import { MoneyText } from "@/components/finance/money-text"
import { PercentText } from "@/components/finance/percent-text"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"

import { getDictionary, getShellLabels, hasLocale } from "../../dictionaries"

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ lang: string; fundCode: string }>
}) {
  const { lang, fundCode } = await params

  if (!hasLocale(lang)) {
    return null
  }

  const dict = getDictionary(lang)

  return (
    <AppShell
      lang={lang}
      path={`/funds/${fundCode}`}
      labels={getShellLabels(lang)}
      title={dict.shell.titles.fundDetail}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={`${dict.fundDetail.titlePrefix} ${fundCode}`}
          description={dict.fundDetail.description}
          action={
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/${lang}/funds`} />}
            >
              <ArrowLeft className="size-4" />
              {dict.fundDetail.backToList}
            </Button>
          }
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title={dict.fundDetail.estimatedNav}
            value="1.2834"
            description={dict.fundDetail.estimatedNavDescription}
            trend={<ChangeBadge value={0.0182} />}
          />
          <MetricCard
            title={dict.fundDetail.estimatedAsset}
            value={<MoneyText value={52_360_000} compact />}
            description={dict.fundDetail.estimatedAssetDescription}
          />
          <MetricCard
            title={dict.fundDetail.equityPosition}
            value={<PercentText value={0.7625} />}
            description={dict.fundDetail.equityPositionDescription}
          />
          <MetricCard
            title={dict.fundDetail.trackingStatus}
            value={
              <Badge variant="secondary">{dict.fundDetail.tracking}</Badge>
            }
            description={dict.fundDetail.mockStatus}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <DataCard
            title={dict.fundDetail.holdingsTitle}
            description={dict.fundDetail.holdingsDescription}
            action={
              <LastUpdatedText
                label={dict.finance.lastUpdated}
                value="2026-07-09T15:30:00+08:00"
                locale={lang === "zh" ? "zh-CN" : "en-US"}
              />
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {dict.fundDetail.holdings.map((name, index) => (
                <div key={name} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {dict.fundDetail.topHoldingPrefix} {index + 1}
                  </div>
                  <div className="mt-1 font-medium">{name}</div>
                  <div className="mt-3">
                    <ChangeBadge value={[0.0062, -0.011, 0][index] ?? 0} />
                  </div>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard
            title={dict.fundDetail.reportsTitle}
            description={dict.fundDetail.reportsDescription}
          >
            <EmptyState
              title={dict.fundDetail.emptyReportsTitle}
              description={dict.fundDetail.emptyReportsDescription}
            />
          </DataCard>
        </section>
      </div>
    </AppShell>
  )
}
