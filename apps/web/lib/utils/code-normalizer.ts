const FUND_CODE_PATTERN = /^\d{6}$/

export type SupportedMarket = "CN" | "HK" | "US" | "OTHER"

export function normalizeFundCode(fundCode: string) {
  const normalized = fundCode.trim()

  if (!FUND_CODE_PATTERN.test(normalized)) {
    throw new Error("Fund code must be a 6-digit number")
  }

  return normalized
}

export function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase()
}

export function normalizeMarket(market: string): SupportedMarket {
  const normalized = market.trim().toUpperCase()

  if (normalized === "CN" || normalized === "HK" || normalized === "US") {
    return normalized
  }

  return "OTHER"
}
