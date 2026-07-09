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
        symbol: holding.symbol,
        market: holding.market ?? "OTHER",
      }))

    if (stockItems.length === 0) {
      return success([])
    }

    const supabase = createSupabaseAdminClient()
    const quotes: MarketQuoteRow[] = []

    for (const marketItems of groupByMarket(
      dedupeQuoteItems(stockItems),
    ).values()) {
      const symbols = marketItems.map((item) => item.symbol)
      const market = marketItems[0]?.market

      if (!market) {
        continue
      }

      const { data, error } = await supabase
        .from("market_quotes")
        .select()
        .eq("market", market)
        .in("symbol", symbols)

      if (error) {
        return failure("SUPABASE_QUOTES_READ_FAILED", error.message, error)
      }

      quotes.push(...(data ?? []))
    }

    return success(quotes)
  } catch (error) {
    return toFailure("GET_QUOTES_FOR_HOLDINGS_FAILED", error)
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
