import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import test from "node:test"

const repoRoot = new URL("../../../../", import.meta.url).pathname
const webRoot = new URL("../../", import.meta.url).pathname

test("api routes use the shared ApiResponse helpers", () => {
  const routeFiles = findFiles(webRoot, (file) =>
    relative(webRoot, file).startsWith("app/api/") && file.endsWith("route.ts"),
  )

  assert.ok(routeFiles.length > 0)

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8")
    const relativeRouteFile = relative(webRoot, routeFile)

    assert.equal(
      source.includes("NextResponse.json"),
      false,
      `${relativeRouteFile} should use route-response helpers instead of NextResponse.json`,
    )
    assert.equal(
      source.includes("Response.json"),
      false,
      `${relativeRouteFile} should use route-response helpers instead of Response.json`,
    )
  }
})

test("non-cron api routes require a confirmed authenticated user", () => {
  const routeFiles = findFiles(webRoot, (file) =>
    relative(webRoot, file).startsWith("app/api/") && file.endsWith("route.ts"),
  ).filter(
    (routeFile) => !relative(webRoot, routeFile).startsWith("app/api/cron/"),
  )

  assert.ok(routeFiles.length > 0)

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8")
    const relativeRouteFile = relative(webRoot, routeFile)

    assert.match(
      source,
      /getCurrentUserId\(\)/,
      `${relativeRouteFile} should check getCurrentUserId before returning app data`,
    )
    assert.match(
      source,
      /unauthorized\(\)/,
      `${relativeRouteFile} should return ApiResponse unauthorized errors`,
    )
  }
})

test("Vercel app code keeps service role and AKShare outside runtime routes", () => {
  const webFiles = findFiles(webRoot, (file) => {
    const relativeFile = relative(webRoot, file)
    return (
      /\.(ts|tsx)$/.test(file) &&
      !relativeFile.startsWith("node_modules/") &&
      !relativeFile.startsWith(".next/") &&
      relativeFile !== "lib/supabase/admin.ts" &&
      relativeFile !== "lib/api/production-guards.test.ts"
    )
  })

  for (const file of webFiles) {
    const source = readFileSync(file, "utf8")
    const relativeFile = relative(webRoot, file)

    assert.equal(
      source.includes("SUPABASE_SERVICE_ROLE_KEY"),
      false,
      `${relativeFile} should not read the service role key directly`,
    )
    assert.doesNotMatch(
      source,
      /from\s+["']akshare|import\s+.*akshare|child_process|python\s+-m|fund_portfolio_|stock_zh_|fund_open_fund_/i,
      `${relativeFile} should not run AKShare or Python ingestion in Vercel`,
    )
  }

  const workerWorkflow = readFileSync(
    `${repoRoot}.github/workflows/akshare-sync.yml`,
    "utf8",
  )
  assert.match(
    workerWorkflow,
    /SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\.SUPABASE_SERVICE_ROLE_KEY\s*\}\}/,
    relative(repoRoot, `${repoRoot}.github/workflows/akshare-sync.yml`),
  )
})

function findFiles(
  directory: string,
  predicate: (file: string) => boolean,
): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, predicate))
    } else if (predicate(fullPath)) {
      files.push(fullPath)
    }
  }

  return files
}
