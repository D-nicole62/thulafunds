/** User-facing messages for Prisma / Postgres connection failures */
export function isDatabaseUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === "P1001" ||
    Boolean(e.message?.includes("Can't reach database server")) ||
    Boolean(e.message?.includes("Connection refused")) ||
    Boolean(e.message?.includes("ECONNREFUSED"))
  )
}

export function getDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseUnreachableError(error)) {
    return "Cannot reach your Supabase database. Free-tier projects pause after inactivity — open the Supabase Dashboard, restore the project, then copy fresh connection strings into .env and restart the dev server."
  }
  return error instanceof Error ? error.message : "Unknown database error"
}

export const DATABASE_SETUP_STEPS = [
  "Open https://supabase.com/dashboard → your project",
  "If paused, click Restore project and wait ~2 minutes",
  "Settings → Database → copy Session pooler URL (port 6543) to DATABASE_URL",
  "Copy Direct connection URL (port 5432) to DIRECT_URL",
  "Restart: pnpm dev",
  "Verify: pnpm db:test",
] as const
