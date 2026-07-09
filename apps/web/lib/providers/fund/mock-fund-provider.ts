import type { FundBasicInfo, FundDataProvider, FundHolding } from "./types"

const FUND_BASIC_INFO: Record<string, FundBasicInfo> = {
  "000001": {
    fundCode: "000001",
    fundName: "华夏成长混合",
    fundType: "混合型",
    manager: "Mock Manager A",
    company: "华夏基金",
    latestNav: 1.2834,
    latestNavDate: "2026-07-09",
    latestNavChangePct: 1.82,
    source: "mock",
  },
  "161725": {
    fundCode: "161725",
    fundName: "招商中证白酒指数",
    fundType: "指数型",
    manager: "Mock Manager B",
    company: "招商基金",
    latestNav: 0.9821,
    latestNavDate: "2026-07-09",
    latestNavChangePct: -0.64,
    source: "mock",
  },
  "006327": {
    fundCode: "006327",
    fundName: "易方达标普科技 QDII",
    fundType: "QDII",
    manager: "Mock Manager C",
    company: "易方达基金",
    latestNav: 2.4862,
    latestNavDate: "2026-07-09",
    latestNavChangePct: 2.15,
    source: "mock",
  },
}

const HOLDINGS: Record<string, FundHolding[]> = {
  "000001": [
    createHolding("000001", "CN", "600519", "贵州茅台", 8.52),
    createHolding("000001", "CN", "300750", "宁德时代", 7.24),
    createHolding("000001", "CN", "000858", "五粮液", 5.86),
    createHolding("000001", "HK", "00700", "腾讯控股", 4.12),
    createHolding("000001", "US", "AAPL", "Apple Inc.", 3.67),
  ],
  "161725": [
    createHolding("161725", "CN", "600519", "贵州茅台", 15.8),
    createHolding("161725", "CN", "000858", "五粮液", 13.2),
    createHolding("161725", "CN", "000568", "泸州老窖", 9.7),
    createHolding("161725", "CN", "600809", "山西汾酒", 8.4),
    createHolding("161725", "HK", "09988", "阿里巴巴-W", 2.1),
  ],
  "006327": [
    createHolding("006327", "US", "NVDA", "NVIDIA Corporation", 12.4),
    createHolding("006327", "US", "AAPL", "Apple Inc.", 10.6),
    createHolding("006327", "US", "MSFT", "Microsoft Corporation", 9.8),
    createHolding("006327", "HK", "00700", "腾讯控股", 5.5),
    createHolding("006327", "HK", "09988", "阿里巴巴-W", 4.7),
  ],
}

function createHolding(
  fundCode: string,
  market: FundHolding["market"],
  symbol: string,
  name: string,
  weightPct: number,
): FundHolding {
  return {
    fundCode,
    reportPeriod: "2026Q2",
    assetType: "stock",
    market,
    symbol,
    name,
    weightPct,
    source: "mock",
    sourceReportDate: "2026-06-30",
  }
}

export class MockFundProvider implements FundDataProvider {
  async getFundBasicInfo(fundCode: string): Promise<FundBasicInfo> {
    const fund = FUND_BASIC_INFO[fundCode]

    if (!fund) {
      throw new Error(`Mock fund not found: ${fundCode}`)
    }

    return fund
  }

  async getFundHoldings(fundCode: string): Promise<FundHolding[]> {
    const holdings = HOLDINGS[fundCode]

    if (!holdings) {
      throw new Error(`Mock fund holdings not found: ${fundCode}`)
    }

    return holdings
  }
}

export const mockFundProvider = new MockFundProvider()
