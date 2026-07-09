import { createClient } from "@supabase/supabase-js"

import type { Database } from "./types"

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client can only be used on the server")
  }
}

function requireAdminEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required admin environment variable: ${name}`)
  }

  return value
}

export function createSupabaseAdminClient() {
  assertServerOnly()

  return createClient<Database>(
    requireAdminEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireAdminEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
}

export type { Database }
