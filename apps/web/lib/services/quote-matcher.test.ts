import assert from "node:assert/strict"
import test from "node:test"

import {
  buildQuoteSymbolCandidates,
  calculateHoldingEstimate,
  findQuoteForHolding,
  normalizeQuoteSymbol,
} from "./quote-matcher"

const googleHolding = {
  asset_type: "stock",
  market: "CN",
  symbol: "GOOG",
  name: "谷歌-C",
  weight_pct: 6.5,
}

const googleQuote = {
  market: "US",
  symbol: "105.GOOG",
  name: "谷歌-C",
  change_pct: 2.4,
}

test("normalizes only numeric market prefixes from quote symbols", () => {
  assert.equal(normalizeQuoteSymbol("105.GOOG"), "GOOG")
  assert.equal(normalizeQuoteSymbol("GOOG"), "GOOG")
  assert.equal(normalizeQuoteSymbol("BRK.B"), "BRK.B")
})

test("builds index-friendly EastMoney symbol candidates", () => {
  assert.deepEqual(buildQuoteSymbolCandidates(["GOOG", "105.MSFT"]), [
    "GOOG",
    "105.GOOG",
    "106.GOOG",
    "107.GOOG",
    "MSFT",
    "105.MSFT",
    "106.MSFT",
    "107.MSFT",
  ])
})

test("matches a holding to a prefixed quote and uses quote market", () => {
  const quote = findQuoteForHolding(googleHolding, [googleQuote])

  assert.equal(quote?.symbol, "105.GOOG")
  assert.equal(quote?.market, "US")
})

test("falls back to normalized stock name when symbols differ", () => {
  const quote = findQuoteForHolding({ ...googleHolding, symbol: "GOOGL-C" }, [
    googleQuote,
  ])

  assert.equal(quote, googleQuote)
})

test("does not guess when a name-only match is ambiguous", () => {
  const quote = findQuoteForHolding(
    { ...googleHolding, symbol: "UNKNOWN", name: "同名公司" },
    [
      { ...googleQuote, symbol: "105.ONE", name: "同名公司" },
      { ...googleQuote, symbol: "106.TWO", name: "同名公司" },
    ],
  )

  assert.equal(quote, undefined)
})

test("calculates current estimate from matched quote changes and weights", () => {
  assert.deepEqual(
    calculateHoldingEstimate(
      [
        googleHolding,
        {
          asset_type: "stock",
          market: "US",
          symbol: "MSFT",
          name: "微软",
          weight_pct: 3.5,
        },
      ],
      [
        googleQuote,
        {
          market: "US",
          symbol: "105.MSFT",
          name: "微软",
          change_pct: -1,
        },
      ],
    ),
    {
      estimatedChangePct: 0.121,
      coveredWeightPct: 10,
    },
  )
})

test("does not treat a missing quote change as a flat trading day", () => {
  assert.deepEqual(
    calculateHoldingEstimate(
      [googleHolding],
      [{ ...googleQuote, change_pct: null }],
    ),
    {
      estimatedChangePct: 0,
      coveredWeightPct: 0,
    },
  )
})
