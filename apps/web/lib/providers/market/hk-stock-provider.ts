import type { MarketDataProvider, MarketQuote } from "./types"

function notImplemented(): never {
  throw new Error(
    "Hong Kong stock market provider is not implemented. Set USE_MOCK_DATA=true to use mock market data.",
  )
}

export class HkStockProvider implements MarketDataProvider {
  async getQuote(): Promise<MarketQuote> {
    return notImplemented()
  }

  async getQuotes(): Promise<MarketQuote[]> {
    return notImplemented()
  }
}
