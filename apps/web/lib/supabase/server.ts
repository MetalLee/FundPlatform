import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "./types"

function requireServerEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }

  return value
}

export async function createSupabaseServerClient() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const cookieStore = await cookies()

  return createServerClient<Database>(
    requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components can read cookies but cannot write them.
          }
        },
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
