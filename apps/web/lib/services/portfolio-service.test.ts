import assert from "node:assert/strict"
import test from "node:test"

import { buildPositionPersistenceInput } from "./portfolio-service"

test("keeps daily investment plan out of official position persistence", () => {
  const result = buildPositionPersistenceInput("user-1", {
    fundCode: "000001",
    holdingAmount: 1000,
    holdingShares: 500,
    costAmount: 900,
    dailyInvestAmount: 50,
    note: "manual",
  })

  assert.deepEqual(result.position, {
    user_id: "user-1",
    fund_code: "000001",
    holding_amount: 1000,
    holding_shares: 500,
    cost_amount: 900,
    note: "manual",
  })
  assert.deepEqual(result.plan, {
    user_id: "user-1",
    fund_code: "000001",
    daily_invest_amount: 50,
    is_active: true,
  })
})
