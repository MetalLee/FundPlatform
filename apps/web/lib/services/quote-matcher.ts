type HoldingQuoteInput = {
  asset_type: string
  market: string | null
  symbol: string
  name: string | null
  weight_pct: number | null
}

type QuoteMatchInput = {
  market: string
  symbol: string
  name: string | null
  change_pct: number | null
}

const EASTMONEY_MARKET_PREFIXES = ["105", "106", "107"]

export function normalizeQuoteSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  const prefixedSymbol = normalized.match(/^\d+\.(.+)$/)

  return prefixedSymbol?.[1] ?? normalized
}

export function normalizeQuoteName(name: string | null | undefined) {
  return (name ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase()
}

export function buildQuoteSymbolCandidates(symbols: string[]) {
  const candidates = new Set<string>()

  for (const symbol of symbols) {
    const baseSymbol = normalizeQuoteSymbol(symbol)
    candidates.add(baseSymbol)

    for (const prefix of EASTMONEY_MARKET_PREFIXES) {
      candidates.add(`${prefix}.${baseSymbol}`)
    }
  }

  return Array.from(candidates)
}

export function findQuoteForHolding<T extends QuoteMatchInput>(
  holding: HoldingQuoteInput,
  quotes: T[],
): T | undefined {
  const holdingSymbol = normalizeQuoteSymbol(holding.symbol)
  const holdingName = normalizeQuoteName(holding.name)

  const uniqueQuotes = Array.from(
    new Map(
      quotes.map((quote) => [`${quote.market}:${quote.symbol}`, quote]),
    ).values(),
  )
  const symbolMatches = uniqueQuotes.filter(
    (quote) => normalizeQuoteSymbol(quote.symbol) === holdingSymbol,
  )
  const nameMatches =
    holdingName.length > 0
      ? uniqueQuotes.filter(
          (quote) => normalizeQuoteName(quote.name) === holdingName,
        )
      : []
  const exactMatches = symbolMatches.filter((quote) =>
    nameMatches.includes(quote),
  )

  if (exactMatches.length === 1) {
    return exactMatches[0]
  }

  if (exactMatches.length > 1) {
    return undefined
  }

  if (symbolMatches.length === 1) {
    return symbolMatches[0]
  }

  if (symbolMatches.length > 1) {
    return undefined
  }

  return nameMatches.length === 1 ? nameMatches[0] : undefined
}

export function calculateHoldingEstimate(
  holdings: HoldingQuoteInput[],
  quotes: QuoteMatchInput[],
) {
  let estimatedChangePct = 0
  let coveredWeightPct = 0

  for (const holding of holdings) {
    if (holding.asset_type !== "stock") {
      continue
    }

    const quote = findQuoteForHolding(holding, quotes)
    const changePct = toFiniteNumber(quote?.change_pct)
    const weightPct = toFiniteNumber(holding.weight_pct)

    if (!quote || changePct === null || weightPct === null) {
      continue
    }

    estimatedChangePct += (weightPct * changePct) / 100
    coveredWeightPct += weightPct
  }

  return {
    estimatedChangePct: roundNumber(estimatedChangePct),
    coveredWeightPct: roundNumber(coveredWeightPct),
  }
}

function roundNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function toFiniteNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  return Number.isFinite(value) ? value : null
}
