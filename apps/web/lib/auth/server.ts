import type { User } from "@supabase/supabase-js"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email_confirmed_at) {
    return null
  }

  return user
}

export async function getCurrentUserId() {
  const user = await getCurrentUser()

  return user?.id ?? null
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("AUTH_REQUIRED")
  }

  return user
}
