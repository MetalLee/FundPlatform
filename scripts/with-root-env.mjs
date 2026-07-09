import { existsSync, readFileSync } from "node:fs"
import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, "..")

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, "utf8")
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed
    const sepIndex = normalized.indexOf("=")
    if (sepIndex < 0) {
      continue
    }

    const key = normalized.slice(0, sepIndex).trim()
    let value = normalized.slice(sepIndex + 1).trim()
    if (!key) {
      continue
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

parseEnvFile(resolve(rootDir, ".env"))
parseEnvFile(resolve(rootDir, ".env.local"))

const [, , command, ...args] = process.argv
if (!command) {
  console.error("Usage: node scripts/with-root-env.mjs <command> [args...]")
  process.exit(1)
}

const child = spawn(command, args, {
  stdio: "inherit",
  cwd: rootDir,
  env: process.env,
  shell: process.platform === "win32",
})

child.on("error", (error) => {
  console.error(`Failed to start command '${command}': ${error.message}`)
  process.exit(1)
})

child.on("close", (code) => {
  process.exit(code ?? 0)
})
