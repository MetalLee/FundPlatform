import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { MoneyText } from "@/components/finance/money-text"
import { PageHeader } from "@/components/page-header"
import { RiskNotice } from "@/components/risk-notice"

import { getDictionary, getShellLabels, hasLocale } from "../dictionaries"

export default async function FundsPage({
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
      path="/funds"
      labels={getShellLabels(lang)}
      title={dict.shell.titles.funds}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title={dict.funds.title}
          description={dict.funds.description}
          action={
            <Button>
              <Plus className="size-4" />
              {dict.funds.addFund}
            </Button>
          }
        />
        <RiskNotice
          title={dict.riskNotice.title}
          description={dict.riskNotice.description}
        />

        <DataCard
          title={dict.funds.allFundsTitle}
          description={dict.funds.allFundsDescription}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.funds.table.name}</TableHead>
                <TableHead>{dict.funds.table.type}</TableHead>
                <TableHead>{dict.funds.table.asset}</TableHead>
                <TableHead>{dict.funds.table.status}</TableHead>
                <TableHead className="text-right">
                  {dict.funds.table.change}
                </TableHead>
                <TableHead className="text-right">
                  {dict.funds.table.action}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dict.funds.list.map((fund) => (
                <TableRow key={fund.code}>
                  <TableCell>
                    <div className="font-medium">{fund.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fund.code}
                    </div>
                  </TableCell>
                  <TableCell>{fund.type}</TableCell>
                  <TableCell>
                    <MoneyText value={fund.asset} compact />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{fund.status}</Badge>
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
                      {dict.funds.detail}
                      <ArrowRight className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      </div>
    </AppShell>
  )
}
