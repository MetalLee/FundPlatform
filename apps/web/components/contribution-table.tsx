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

export type ContributionRow = {
  market: string
  symbol: string
  name: string | null
  weightPct: number
  changePct: number
  contributionPct: number
}

type ContributionTableLabels = {
  emptyTitle: string
  emptyDescription: string
  columns: {
    symbol: string
    name: string
    market: string
    weightPct: string
    changePct: string
    contributionPct: string
  }
}

type ContributionTableProps = {
  rows: ContributionRow[]
  labels: ContributionTableLabels
  unknownLabel: string
  locale: string
}

export function ContributionTable({
  rows,
  labels,
  unknownLabel,
  locale,
}: ContributionTableProps) {
  if (rows.length === 0) {
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
          <TableHead className="text-right">
            {labels.columns.weightPct}
          </TableHead>
          <TableHead className="text-right">
            {labels.columns.changePct}
          </TableHead>
          <TableHead className="text-right">
            {labels.columns.contributionPct}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.market}:${row.symbol}`}>
            <TableCell className="font-medium">{row.symbol}</TableCell>
            <TableCell>{row.name ?? unknownLabel}</TableCell>
            <TableCell>
              <Badge variant="outline">{row.market}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <PercentText value={row.weightPct / 100} />
            </TableCell>
            <TableCell className="text-right">
              <ChangeBadge value={row.changePct / 100} locale={locale} />
            </TableCell>
            <TableCell className="text-right">
              <PercentText value={row.contributionPct / 100} signed />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
