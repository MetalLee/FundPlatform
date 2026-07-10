import assert from "node:assert/strict"
import test from "node:test"

import { CHANGE_BADGE_VARIANT, getChangeBadgeColor } from "./change-badge"

test("uses red for gains and green for losses in Chinese", () => {
  assert.equal(getChangeBadgeColor(1, "zh-CN"), "red")
  assert.equal(getChangeBadgeColor(-1, "zh"), "green")
})

test("uses green for gains and red for losses in English", () => {
  assert.equal(getChangeBadgeColor(1, "en-US"), "green")
  assert.equal(getChangeBadgeColor(-1, "en"), "red")
})

test("keeps flat changes neutral in every locale", () => {
  assert.equal(getChangeBadgeColor(0, "zh-CN"), "neutral")
  assert.equal(getChangeBadgeColor(0, "en-US"), "neutral")
})

test("renders with the shared secondary badge style", () => {
  assert.equal(CHANGE_BADGE_VARIANT, "secondary")
})
