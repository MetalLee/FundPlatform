export type MarketQuote = {
  market: "CN" | "HK" | "US" | "OTHER"
  symbol: string
  name?: string
  price?: number
  previousClose?: number
  changePct?: number
  currency?: string
  quoteTime?: string
  source: string
  raw?: unknown
}

export interface MarketDataProvider {
  getQuote(symbol: string, market: string): Promise<MarketQuote>
  getQuotes(
    items: Array<{ symbol: string; market: string }>,
  ): Promise<MarketQuote[]>
}
