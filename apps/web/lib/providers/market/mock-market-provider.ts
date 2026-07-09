import type { MarketDataProvider, MarketQuote } from "./types"

const QUOTE_TIME = "2026-07-09T15:30:00+08:00"

const QUOTES: Record<string, MarketQuote> = {
  "CN:600519": createQuote("CN", "600519", "贵州茅台", 1688, 1677.6, 0.62),
  "CN:300750": createQuote("CN", "300750", "宁德时代", 212.4, 214.76, -1.1),
  "CN:000858": createQuote("CN", "000858", "五粮液", 138.2, 137.1, 0.8),
  "CN:000568": createQuote("CN", "000568", "泸州老窖", 182.6, 185.0, -1.3),
  "CN:600809": createQuote("CN", "600809", "山西汾酒", 224.3, 220.75, 1.61),
  "HK:00700": createQuote("HK", "00700", "腾讯控股", 418.2, 412.0, 1.5, "HKD"),
  "HK:09988": createQuote(
    "HK",
    "09988",
    "阿里巴巴-W",
    81.35,
    82.4,
    -1.27,
    "HKD",
  ),
  "US:NVDA": createQuote(
    "US",
    "NVDA",
    "NVIDIA Corporation",
    164.1,
    159.9,
    2.63,
    "USD",
  ),
  "US:AAPL": createQuote(
    "US",
    "AAPL",
    "Apple Inc.",
    221.8,
    224.2,
    -1.07,
    "USD",
  ),
  "US:MSFT": createQuote(
    "US",
    "MSFT",
    "Microsoft Corporation",
    512.4,
    506.3,
    1.2,
    "USD",
  ),
}

function createQuote(
  market: MarketQuote["market"],
  symbol: string,
  name: string,
  price: number,
  previousClose: number,
  changePct: number,
  currency = "CNY",
): MarketQuote {
  return {
    market,
    symbol,
    name,
    price,
    previousClose,
    changePct,
    currency,
    quoteTime: QUOTE_TIME,
    source: "mock",
    raw: { mock: true },
  }
}

function normalizeMarket(market: string): MarketQuote["market"] {
  if (market === "CN" || market === "HK" || market === "US") {
    return market
  }

  return "OTHER"
}

function quoteKey(symbol: string, market: string) {
  return `${normalizeMarket(market)}:${symbol.toUpperCase()}`
}

export class MockMarketProvider implements MarketDataProvider {
  async getQuote(symbol: string, market: string): Promise<MarketQuote> {
    const quote = QUOTES[quoteKey(symbol, market)]

    if (!quote) {
      throw new Error(`Mock market quote not found: ${market}:${symbol}`)
    }

    return quote
  }

  async getQuotes(
    items: Array<{ symbol: string; market: string }>,
  ): Promise<MarketQuote[]> {
    return Promise.all(
      items.map((item) => this.getQuote(item.symbol, item.market)),
    )
  }
}

export const mockMarketProvider = new MockMarketProvider()
