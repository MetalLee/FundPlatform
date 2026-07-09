import { EastMoneyFundProvider } from "./eastmoney-fund-provider"
import { mockFundProvider } from "./mock-fund-provider"
import type { FundDataProvider } from "./types"

function shouldUseMockData() {
  return process.env.USE_MOCK_DATA !== "false"
}

export function createFundDataProvider(): FundDataProvider {
  if (shouldUseMockData()) {
    return mockFundProvider
  }

  return new EastMoneyFundProvider()
}

export * from "./types"
