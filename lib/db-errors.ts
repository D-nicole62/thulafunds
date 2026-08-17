/** User-facing messages for Supabase database connection failures */
export function isDatabaseUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === "PGRST001" ||
    e.code === "PGRST002" ||
    Boolean(e.message?.includes("Failed to fetch")) ||
    Boolean(e.message?.includes("fetch failed")) ||
    Boolean(e.message?.includes("ECONNREFUSED")) ||
    Boolean(e.message?.includes("SUPABASE_SERVICE_ROLE_KEY"))
  )
}

export function getDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseUnreachableError(error)) {
    return "Cannot reach your Supabase database. Free-tier projects pause after inactivity — open the Supabase Dashboard, restore the project, then verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  }
  return formatPostgresError(error) ?? "Unknown database error"
}

/** Combine Supabase/PostgREST error fields into one user-facing string. */
export function formatPostgresError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const e = error as { message?: string; details?: string; hint?: string; code?: string }
  const parts = [e.message, e.details, e.hint].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(" — ")
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return formatPostgresError(error) ?? (error instanceof Error ? error.message : fallback)
}

export const DATABASE_SETUP_STEPS = [
  "Open https://supabase.com/dashboard → your project",
  "If paused, click Restore project and wait ~2 minutes",
  "Settings → API → copy Project URL to NEXT_PUBLIC_SUPABASE_URL",
  "Copy anon/publishable key to NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "Copy service_role key to SUPABASE_SERVICE_ROLE_KEY (server only, never expose to client)",
  "Restart: pnpm dev",
  "Verify: pnpm db:test",
] as const
