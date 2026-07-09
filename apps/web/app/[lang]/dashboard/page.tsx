import Link from "next/link"
import { ArrowLeft, CircleDollarSign, Landmark, TrendingUp } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Progress, ProgressLabel } from "@workspace/ui/components/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { getDictionary, hasLocale } from "../dictionaries"
import { LanguageSwitcher } from "../language-switcher"

const metricIcons = [Landmark, CircleDollarSign, TrendingUp]

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
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Badge variant="secondary" className="w-fit">
              {dict.dashboard.badge}
            </Badge>
            <h1 className="text-2xl font-medium md:text-3xl">
              {dict.dashboard.title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {dict.dashboard.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher
              currentLocale={lang}
              path="/dashboard"
              labels={dict.common}
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/${lang}`} />}
            >
              <ArrowLeft />
              {dict.common.home}
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {dict.dashboard.metrics.map((metric, index) => {
            const Icon = metricIcons[index] ?? Landmark

            return (
              <Card key={metric.label}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{metric.label}</CardTitle>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{metric.detail}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-medium tabular-nums">
                    {metric.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.fundProgressTitle}</CardTitle>
              <CardDescription>
                {dict.dashboard.fundProgressDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {dict.dashboard.funds.map((fund) => (
                <div key={fund.name} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{fund.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fund.deployed} {dict.dashboard.deployedOf}{" "}
                        {fund.target}
                      </div>
                    </div>
                    <Badge variant="outline">{fund.status}</Badge>
                  </div>
                  <Progress value={fund.progress}>
                    <ProgressLabel>{fund.name}</ProgressLabel>
                    <span className="ml-auto text-xs/relaxed text-muted-foreground tabular-nums">
                      {fund.progress}%
                    </span>
                  </Progress>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.recentActivityTitle}</CardTitle>
              <CardDescription>
                {dict.dashboard.recentActivityDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.dashboard.table.date}</TableHead>
                    <TableHead>{dict.dashboard.table.event}</TableHead>
                    <TableHead>{dict.dashboard.table.fund}</TableHead>
                    <TableHead className="text-right">
                      {dict.dashboard.table.amount}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dict.dashboard.activity.map((item) => (
                    <TableRow key={`${item.date}-${item.event}`}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell className="font-medium">
                        {item.event}
                      </TableCell>
                      <TableCell>{item.fund}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
