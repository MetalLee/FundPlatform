import { AShareProvider } from "./a-share-provider"
import { HkStockProvider } from "./hk-stock-provider"
import { mockMarketProvider } from "./mock-market-provider"
import type { MarketDataProvider, MarketQuote } from "./types"
import { UsStockProvider } from "./us-stock-provider"

function shouldUseMockData() {
  return process.env.USE_MOCK_DATA !== "false"
}

function normalizeMarket(market: string): MarketQuote["market"] {
  if (market === "CN" || market === "HK" || market === "US") {
    return market
  }

  return "OTHER"
}

class RoutedMarketProvider implements MarketDataProvider {
  private readonly providers: Record<"CN" | "HK" | "US", MarketDataProvider>

  constructor() {
    this.providers = {
      CN: new AShareProvider(),
      HK: new HkStockProvider(),
      US: new UsStockProvider(),
    }
  }

  async getQuote(symbol: string, market: string): Promise<MarketQuote> {
    const normalizedMarket = normalizeMarket(market)

    if (normalizedMarket === "OTHER") {
      throw new Error(`Unsupported market provider: ${market}`)
    }

    return this.providers[normalizedMarket].getQuote(symbol, normalizedMarket)
  }

  async getQuotes(
    items: Array<{ symbol: string; market: string }>,
  ): Promise<MarketQuote[]> {
    return Promise.all(
      items.map((item) => this.getQuote(item.symbol, item.market)),
    )
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  if (shouldUseMockData()) {
    return mockMarketProvider
  }

  return new RoutedMarketProvider()
}

export * from "./types"
