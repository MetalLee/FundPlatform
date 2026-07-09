import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Progress, ProgressLabel } from "@workspace/ui/components/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { AppShell } from "@/components/app-shell"
import { DataCard } from "@/components/data-card"
import { ChangeBadge } from "@/components/finance/change-badge"
import { LastUpdatedText } from "@/components/finance/last-updated-text"
import { MoneyText } from "@/components/finance/money-text"
import { PercentText } from "@/components/finance/percent-text"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

export default async function DashboardPage({
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
      path="/dashboard"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.dashboard}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.dashboard.title}
          description={dict.dashboard.description}
          action={
            <Button variant="outline">
              <Download className="size-4" />
              {dict.dashboard.exportSnapshot}
            </Button>
          }
        />

        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <section className="grid gap-4 md:grid-cols-3">
          {dict.dashboard.metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              description={metric.description}
              value={
                metric.key === "volatility" ? (
                  <PercentText value={metric.value} />
                ) : (
                  <MoneyText value={metric.value} compact />
                )
              }
              trend={<ChangeBadge value={metric.trend} />}
            />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <DataCard
            title={dict.dashboard.allocationTitle}
            description={dict.dashboard.allocationDescription}
          >
            <div className="space-y-5">
              {dict.dashboard.allocation.map((item) => (
                <div key={item.label} className="space-y-2">
                  <Progress value={item.value}>
                    <ProgressLabel>{item.label}</ProgressLabel>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {item.value}%
                    </span>
                  </Progress>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard
            title={dict.dashboard.focusFundsTitle}
            description={dict.dashboard.focusFundsDescription}
            action={
              <LastUpdatedText
                label={dict.finance.lastUpdated}
                value="2026-07-09T15:30:00+08:00"
                locale={lang === "zh" ? "zh-CN" : "en-US"}
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.dashboard.table.fund}</TableHead>
                  <TableHead>{dict.dashboard.table.estimatedNav}</TableHead>
                  <TableHead className="text-right">
                    {dict.dashboard.table.change}
                  </TableHead>
                  <TableHead className="text-right">
                    {dict.dashboard.table.action}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dict.dashboard.funds.map((fund) => (
                  <TableRow key={fund.code}>
                    <TableCell>
                      <div className="font-medium">{fund.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fund.code}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fund.nav.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ChangeBadge value={fund.change} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        nativeButton={false}
                        variant="ghost"
                        render={<Link href={`/${lang}/funds/${fund.code}`} />}
                      >
                        {dict.dashboard.table.view}
                        <ArrowRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </section>
      </div>
    </AppShell>
  )
}
