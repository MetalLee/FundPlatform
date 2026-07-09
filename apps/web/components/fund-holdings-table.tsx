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
import { PercentText } from "@/components/finance/percent-text"
import type { Database } from "@/lib/supabase/types"

type FundHolding = Database["public"]["Tables"]["fund_holdings"]["Row"]

type FundHoldingsTableLabels = {
  emptyTitle: string
  emptyDescription: string
  columns: {
    symbol: string
    name: string
    market: string
    assetType: string
    weightPct: string
    reportPeriod: string
    source: string
  }
}

type FundHoldingsTableProps = {
  holdings: FundHolding[]
  labels: FundHoldingsTableLabels
  unknownLabel: string
}

export function FundHoldingsTable({
  holdings,
  labels,
  unknownLabel,
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
          <TableHead className="text-right">{labels.columns.weightPct}</TableHead>
          <TableHead>{labels.columns.reportPeriod}</TableHead>
          <TableHead>{labels.columns.source}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => (
          <TableRow key={holding.id}>
            <TableCell className="font-medium">{holding.symbol}</TableCell>
            <TableCell>{holding.name ?? unknownLabel}</TableCell>
            <TableCell>
              <Badge variant="outline">{holding.market ?? unknownLabel}</Badge>
            </TableCell>
            <TableCell>{holding.asset_type}</TableCell>
            <TableCell className="text-right">
              <PercentText value={Number(holding.weight_pct ?? 0) / 100} />
            </TableCell>
            <TableCell>{holding.report_period}</TableCell>
            <TableCell>{holding.source ?? unknownLabel}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
