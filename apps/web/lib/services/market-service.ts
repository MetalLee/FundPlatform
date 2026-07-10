import { createMarketDataProvider } from "@/lib/providers/market/provider-factory"
import type { MarketQuote } from "@/lib/providers/market/types"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database, Json } from "@/lib/supabase/types"
import {
  failure,
  success,
  toFailure,
  type ApiResponse,
} from "@/lib/utils/api-response"
import {
  normalizeFundCode,
  normalizeMarket,
  normalizeSymbol,
} from "@/lib/utils/code-normalizer"

import { getLatestHoldings } from "./holding-service"
import {
  buildQuoteSymbolCandidates,
  findQuoteForHolding,
} from "./quote-matcher"

type FundHoldingRow = Database["public"]["Tables"]["fund_holdings"]["Row"]
type MarketQuoteRow = Database["public"]["Tables"]["market_quotes"]["Row"]

export type QuoteRequestItem = {
  symbol: string
  market: string
}

export async function syncQuotesForFund(
  fundCode: string,
): Promise<ApiResponse<MarketQuoteRow[]>> {
  try {
    normalizeFundCode(fundCode)
    const holdingsResponse = await getLatestHoldings(fundCode)

    if (!holdingsResponse.ok) {
      return holdingsResponse
    }

    const stockItems = holdingsResponse.data
      .filter((holding) => holding.asset_type === "stock")
      .map((holding) => ({
        symbol: holding.symbol,
        market: holding.market ?? "OTHER",
      }))

    return syncQuotesForSymbols(stockItems)
  } catch (error) {
    return toFailure("SYNC_QUOTES_FOR_FUND_FAILED", error)
  }
}

export async function syncQuotesForSymbols(
  items: QuoteRequestItem[],
): Promise<ApiResponse<MarketQuoteRow[]>> {
  try {
    const uniqueItems = dedupeQuoteItems(items)
    const provider = createMarketDataProvider()
    const quotes: MarketQuote[] = []

    for (const marketItems of groupByMarket(uniqueItems).values()) {
      const marketQuotes = await provider.getQuotes(marketItems)
      quotes.push(...marketQuotes)
    }

    if (quotes.length === 0) {
      return success([])
    }

    const supabase = createSupabaseAdminClient()
    const rows = quotes.map((quote) => ({
      market: quote.market,
      symbol: quote.symbol,
      name: quote.name ?? null,
      price: quote.price ?? null,
      previous_close: quote.previousClose ?? null,
      change_pct: quote.changePct ?? null,
      currency: quote.currency ?? null,
      quote_time: quote.quoteTime ?? null,
      source: quote.source,
      data_source: quote.source,
      last_synced_at: new Date().toISOString(),
      raw: toJsonValue(quote.raw),
    }))

    const { data, error } = await supabase
      .from("market_quotes")
      .upsert(rows, { onConflict: "market,symbol" })
      .select()

    if (error) {
      return failure("SUPABASE_QUOTES_UPSERT_FAILED", error.message, error)
    }

    return success(data ?? [])
  } catch (error) {
    return toFailure("SYNC_QUOTES_FOR_SYMBOLS_FAILED", error)
  }
}

export async function getQuotesForHoldings(
  holdings: FundHoldingRow[],
): Promise<ApiResponse<MarketQuoteRow[]>> {
  try {
    const stockItems = holdings
      .filter((holding) => holding.asset_type === "stock")
      .map((holding) => ({
        asset_type: holding.asset_type,
        symbol: holding.symbol,
        market: holding.market ?? "OTHER",
        name: holding.name,
        weight_pct: holding.weight_pct,
      }))

    if (stockItems.length === 0) {
      return success([])
    }

    const supabase = createSupabaseAdminClient()
    const quoteCandidates = new Map<string, MarketQuoteRow>()
    const symbols = buildQuoteSymbolCandidates(
      stockItems.map((item) => normalizeSymbol(item.symbol)),
    )
    const names = Array.from(
      new Set(
        stockItems
          .map((item) => item.name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    )

    const candidateQueries = [
      supabase.from("market_quotes").select().in("symbol", symbols),
      ...(names.length > 0
        ? [supabase.from("market_quotes").select().in("name", names)]
        : []),
    ]

    const candidateResponses = await Promise.all(candidateQueries)

    for (const response of candidateResponses) {
      if (response.error) {
        return failure(
          "SUPABASE_QUOTES_READ_FAILED",
          response.error.message,
          response.error,
        )
      }

      for (const quote of response.data ?? []) {
        quoteCandidates.set(`${quote.market}:${quote.symbol}`, quote)
      }
    }

    let quotes = matchQuotesForHoldings(
      stockItems,
      Array.from(quoteCandidates.values()),
    )

    if (shouldUseMockData() && quotes.length < stockItems.length) {
      const matchedHoldings = new Set(
        quotes.map((quote) => `${quote.market}:${quote.symbol}`),
      )
      const missingItems = stockItems.filter((holding) => {
        const quote = findQuoteForHolding(holding, quotes)
        return !quote || !matchedHoldings.has(`${quote.market}:${quote.symbol}`)
      })
      const mockQuotesResponse = await getMockQuotes(missingItems)

      if (mockQuotesResponse.ok) {
        quotes = matchQuotesForHoldings(stockItems, [
          ...quotes,
          ...mockQuotesResponse.data,
        ])
      }
    }

    return success(quotes)
  } catch (error) {
    return toFailure("GET_QUOTES_FOR_HOLDINGS_FAILED", error)
  }
}

function matchQuotesForHoldings(
  holdings: Array<{
    asset_type: string
    market: string
    symbol: string
    name: string | null
    weight_pct: number | null
  }>,
  candidates: MarketQuoteRow[],
) {
  const matches = new Map<string, MarketQuoteRow>()

  for (const holding of holdings) {
    const quote = findQuoteForHolding(holding, candidates)

    if (quote) {
      matches.set(`${quote.market}:${quote.symbol}`, quote)
    }
  }

  return Array.from(matches.values())
}

export async function getCachedQuotesForSymbols(
  items: QuoteRequestItem[],
): Promise<ApiResponse<MarketQuoteRow[]>> {
  try {
    const uniqueItems = dedupeQuoteItems(items)
    const supabase = createSupabaseAdminClient()
    const quotes: MarketQuoteRow[] = []

    for (const marketItems of groupByMarket(uniqueItems).values()) {
      const market = marketItems[0]?.market

      if (!market) {
        continue
      }

      const { data, error } = await supabase
        .from("market_quotes")
        .select()
        .eq("market", market)
        .in(
          "symbol",
          marketItems.map((item) => item.symbol),
        )

      if (error) {
        return failure("SUPABASE_QUOTES_READ_FAILED", error.message, error)
      }

      quotes.push(...(data ?? []))
    }

    if (shouldUseMockData() && quotes.length < uniqueItems.length) {
      const mockQuotesResponse = await getMockQuotes(uniqueItems)

      if (mockQuotesResponse.ok) {
        const existingKeys = new Set(
          quotes.map((quote) => `${quote.market}:${quote.symbol}`),
        )
        quotes.push(
          ...mockQuotesResponse.data.filter(
            (quote) => !existingKeys.has(`${quote.market}:${quote.symbol}`),
          ),
        )
      }
    }

    return success(quotes)
  } catch (error) {
    return toFailure("GET_CACHED_QUOTES_FOR_SYMBOLS_FAILED", error)
  }
}

async function getMockQuotes(
  items: QuoteRequestItem[],
): Promise<ApiResponse<MarketQuoteRow[]>> {
  try {
    const provider = createMarketDataProvider()
    const now = new Date().toISOString()
    const quotes = await provider.getQuotes(dedupeQuoteItems(items))

    return success(
      quotes.map((quote, index) => ({
        id: `${quote.market}-${quote.symbol}-${index}`,
        market: quote.market,
        symbol: quote.symbol,
        name: quote.name ?? null,
        price: quote.price ?? null,
        previous_close: quote.previousClose ?? null,
        change_pct: quote.changePct ?? null,
        currency: quote.currency ?? null,
        quote_time: quote.quoteTime ?? null,
        source: quote.source,
        data_source: quote.source,
        last_synced_at: now,
        raw: toJsonValue(quote.raw),
        created_at: null,
        updated_at: null,
      })),
    )
  } catch {
    return success([])
  }
}

function dedupeQuoteItems(items: QuoteRequestItem[]) {
  const deduped = new Map<string, QuoteRequestItem>()

  for (const item of items) {
    const market = normalizeMarket(item.market)
    const symbol = normalizeSymbol(item.symbol)
    deduped.set(`${market}:${symbol}`, { market, symbol })
  }

  return Array.from(deduped.values())
}

function groupByMarket(items: QuoteRequestItem[]) {
  const groups = new Map<string, QuoteRequestItem[]>()

  for (const item of items) {
    const group = groups.get(item.market) ?? []
    group.push(item)
    groups.set(item.market, group)
  }

  return groups
}

function toJsonValue(value: unknown): Json | null {
  if (value === undefined) {
    return null
  }

  return value as Json
}

function shouldUseMockData() {
  return process.env.USE_MOCK_DATA !== "false"
}
