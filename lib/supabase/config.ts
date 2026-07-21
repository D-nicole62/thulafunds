const PLACEHOLDER_VALUES = new Set([
  "",
  "your-anon-key-here",
  "your_supabase_anon_key",
  "https://your-project.supabase.co",
])

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return undefined
  return trimmed
}

/** Supabase project URL from env. */
export function getSupabaseUrl(): string | undefined {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/**
 * Browser-safe Supabase key (anon JWT or publishable `sb_publishable_...`).
 * Supports legacy and new Supabase env var names.
 */
export function getSupabaseAnonKey(): string | undefined {
  return (
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  )
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured for this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in Vercel, then redeploy."
