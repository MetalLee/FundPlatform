import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAuthRedirectPath,
  getSafeNextPath,
  isProtectedAppPath,
} from "./redirects"

test("detects localized protected app paths", () => {
  assert.equal(isProtectedAppPath("/zh/dashboard"), true)
  assert.equal(isProtectedAppPath("/en/funds/000001"), true)
  assert.equal(isProtectedAppPath("/zh/auth/login"), false)
  assert.equal(isProtectedAppPath("/zh"), false)
})

test("builds a localized login redirect with a safe next path", () => {
  assert.equal(
    buildAuthRedirectPath("zh", "/zh/portfolio?tab=positions"),
    "/zh/auth/login?next=%2Fzh%2Fportfolio%3Ftab%3Dpositions",
  )
})

test("rejects unsafe next paths", () => {
  assert.equal(getSafeNextPath("https://evil.example/phish", "en"), "/en/dashboard")
  assert.equal(getSafeNextPath("//evil.example/phish", "zh"), "/zh/dashboard")
  assert.equal(getSafeNextPath("/en/funds", "zh"), "/en/funds")
})
