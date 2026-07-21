import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config"

let adminClient: SupabaseClient | undefined

export function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim()
  )
}

/** Server-side Supabase client with service role (bypasses RLS). */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = getSupabaseUrl()
  const serviceKey = getServiceRoleKey()

  if (!isSupabaseConfigured() || !url || !serviceKey) {
    throw new Error(
      "Server database access requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
        "Copy the service role key from Supabase Dashboard → Settings → API.",
    )
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return adminClient
}
