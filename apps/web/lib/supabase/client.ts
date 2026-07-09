"use client"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "./types"

function requirePublicEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`)
  }

  return value
}

export function createSupabaseBrowserClient() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createClient<Database>(
    requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      publishableKey
    ),
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  )
}

export type { Database }
