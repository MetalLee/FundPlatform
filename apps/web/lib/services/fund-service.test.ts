import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPendingFundUpsert,
  buildFreshnessWarnings,
  normalizeFreshnessWarning,
} from "./fund-service"

test("normalizes missing shared data into a stale data warning", () => {
  assert.equal(normalizeFreshnessWarning(null), "data_missing")
})

test("normalizes old shared data into a stale data warning", () => {
  assert.equal(
    normalizeFreshnessWarning("2026-07-01T00:00:00.000Z", new Date("2026-07-09T00:00:00.000Z")),
    "data_stale",
  )
})

test("keeps recently synced shared data warning-free", () => {
  assert.equal(
    normalizeFreshnessWarning("2026-07-08T00:00:00.000Z", new Date("2026-07-09T00:00:00.000Z")),
    null,
  )
})

test("builds estimate freshness warnings without changing estimate inputs", () => {
  assert.deepEqual(
    buildFreshnessWarnings({
      quoteTimes: ["2026-07-01T08:00:00.000Z"],
      holdingReportDates: ["2025-12-31"],
      coveredWeightPct: 12,
      latestSyncLog: {
        status: "failed",
        created_at: "2026-07-09T08:00:00.000Z",
      },
      now: new Date("2026-07-09T12:00:00.000Z"),
    }),
    ["quote_stale", "holding_stale", "low_coverage", "worker_failed"],
  )
})

test("warns when the sync worker has not run recently", () => {
  assert.deepEqual(
    buildFreshnessWarnings({
      quoteTimes: ["2026-07-09T08:00:00.000Z"],
      holdingReportDates: ["2026-06-30"],
      coveredWeightPct: 80,
      latestSyncLog: {
        status: "success",
        created_at: "2026-06-25T08:00:00.000Z",
      },
      now: new Date("2026-07-09T12:00:00.000Z"),
    }),
    ["worker_stale"],
  )
})

test("builds pending shared fund payload when a user adds a tracked fund", () => {
  assert.deepEqual(buildPendingFundUpsert("000001", new Date("2026-07-09T00:00:00.000Z")), {
    fund_code: "000001",
    sync_status: "pending",
    sync_requested_at: "2026-07-09T00:00:00.000Z",
  })
})
