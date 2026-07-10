import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { EmptyState } from "@/components/empty-state"
import { ChangeBadge } from "@/components/finance/change-badge"
import { PercentText } from "@/components/finance/percent-text"
import { findQuoteForHolding } from "@/lib/services/quote-matcher"
import type { Database } from "@/lib/supabase/types"

type FundHolding = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuote = Database["public"]["Tables"]["market_quotes"]["Row"]

type FundHoldingsTableLabels = {
  emptyTitle: string
  emptyDescription: string
  columns: {
    symbol: string
    name: string
    market: string
    assetType: string
    weightPct: string
    changePct: string
    reportPeriod: string
  }
  assetTypes: {
    stock: string
    bond: string
    other: string
  }
}

type FundHoldingsTableProps = {
  holdings: FundHolding[]
  quotes: MarketQuote[]
  labels: FundHoldingsTableLabels
  unknownLabel: string
  locale: string
}

export function FundHoldingsTable({
  holdings,
  quotes,
  labels,
  unknownLabel,
  locale,
}: FundHoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <EmptyState
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.columns.symbol}</TableHead>
          <TableHead>{labels.columns.name}</TableHead>
          <TableHead>{labels.columns.market}</TableHead>
          <TableHead>{labels.columns.assetType}</TableHead>
          <TableHead className="text-right">
            {labels.columns.weightPct}
          </TableHead>
          <TableHead className="text-right">
            {labels.columns.changePct}
          </TableHead>
          <TableHead>{labels.columns.reportPeriod}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => {
          const quote =
            holding.asset_type === "stock"
              ? findQuoteForHolding(holding, quotes)
              : undefined
          const changePct = quote?.change_pct

          return (
            <TableRow key={holding.id}>
              <TableCell className="font-medium">{holding.symbol}</TableCell>
              <TableCell>{holding.name ?? unknownLabel}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {quote?.market ?? holding.market ?? unknownLabel}
                </Badge>
              </TableCell>
              <TableCell>
                {holding.asset_type === "stock"
                  ? labels.assetTypes.stock
                  : holding.asset_type === "bond"
                    ? labels.assetTypes.bond
                    : labels.assetTypes.other}
              </TableCell>
              <TableCell className="text-right">
                <PercentText value={Number(holding.weight_pct ?? 0) / 100} />
              </TableCell>
              <TableCell className="text-right">
                {quote && changePct !== null && changePct !== undefined ? (
                  <ChangeBadge value={changePct / 100} locale={locale} />
                ) : (
                  <span className="text-muted-foreground">{unknownLabel}</span>
                )}
              </TableCell>
              <TableCell>{holding.report_period}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
