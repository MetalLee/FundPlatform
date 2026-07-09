import type { FundBasicInfo, FundDataProvider, FundHolding } from "./types"

function notImplemented(): never {
  throw new Error(
    "EastMoney fund provider is not implemented. Set USE_MOCK_DATA=true to use mock fund data.",
  )
}

export class EastMoneyFundProvider implements FundDataProvider {
  async getFundBasicInfo(): Promise<FundBasicInfo> {
    return notImplemented()
  }

  async getFundHoldings(): Promise<FundHolding[]> {
    return notImplemented()
  }
}
