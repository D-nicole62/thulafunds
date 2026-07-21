import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  SUPABASE_NOT_CONFIGURED_MESSAGE,
} from "@/lib/supabase/config"

const notConfiguredError = new Error(SUPABASE_NOT_CONFIGURED_MESSAGE)

function createMockClient(): SupabaseClient {
  const reject = async () => ({ data: { user: null, session: null }, error: notConfiguredError })

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

let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    return createMockClient()
  }

  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
      isSingleton: true,
    })
  }

  return browserClient
}
