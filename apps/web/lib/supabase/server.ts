import { createClient } from "@supabase/supabase-js"

import type { Database } from "./types"

function requireServerEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }

  return value
}

export function createSupabaseServerClient() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createClient<Database>(
    requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey),
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

function requireServerValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }

  return value
}
