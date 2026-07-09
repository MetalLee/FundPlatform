export type FundBasicInfo = {
  fundCode: string
  fundName: string
  fundType?: string
  manager?: string
  company?: string
  latestNav?: number
  latestNavDate?: string
  latestNavChangePct?: number
  source: string
}

export type FundHolding = {
  fundCode: string
  reportPeriod: string
  assetType: "stock" | "bond" | "cash" | "other"
  market: "CN" | "HK" | "US" | "OTHER"
  symbol: string
  name: string
  weightPct: number
  shares?: number
  marketValue?: number
  source: string
  sourceReportDate?: string
}

export interface FundDataProvider {
  getFundBasicInfo(fundCode: string): Promise<FundBasicInfo>
  getFundHoldings(fundCode: string): Promise<FundHolding[]>
}
