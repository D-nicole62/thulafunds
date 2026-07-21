import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  SUPABASE_NOT_CONFIGURED_MESSAGE,
} from "@/lib/supabase/config"

function createMockServerClient(): SupabaseClient {
  const notConfigured = new Error(SUPABASE_NOT_CONFIGURED_MESSAGE)
  const reject = async () => ({ data: { user: null, session: null }, error: notConfigured })

  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: reject,
      signUp: reject,
      exchangeCodeForSession: reject,
      resetPasswordForEmail: reject,
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error("Supabase storage is not configured") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as unknown as SupabaseClient
}

export async function createClient(): Promise<SupabaseClient> {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | undefined
  try {
    cookieStore = await cookies()
  } catch {
    // cookies() can throw during static generation
  }

  if (!isSupabaseConfigured()) {
    return createMockServerClient()
  }

  return createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? []
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore?.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  })
}
