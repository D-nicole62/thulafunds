import "dotenv/config"
import { createAdminClient } from "../lib/supabase/admin"
import { isSupabaseConfigured } from "../lib/supabase/config"

async function main() {
  console.log("\nSupabase connectivity probe\n")

  if (!isSupabaseConfigured()) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / key not set")
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set")
    process.exit(1)
  }

  try {
    const db = createAdminClient()
    const start = Date.now()
    const { error } = await db.from("profiles").select("id", { count: "exact", head: true })
    if (error) throw error
    console.log(`OK — Supabase REST API (${Date.now() - start}ms)\n`)
  } catch (err) {
    console.error("FAILED —", err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
