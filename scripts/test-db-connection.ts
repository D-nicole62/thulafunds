import "dotenv/config"
import { createAdminClient } from "../lib/supabase/admin"
import { DATABASE_SETUP_STEPS, getDatabaseErrorMessage } from "../lib/db-errors"
import { isSupabaseConfigured } from "../lib/supabase/config"

async function main() {
  console.log("\nThula Funds — Supabase connection test\n")
  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING")
  console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING")

  if (!isSupabaseConfigured()) {
    console.error("\nERROR: Supabase URL/key not configured in .env\n")
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\nERROR: SUPABASE_SERVICE_ROLE_KEY is required for server database access\n")
    process.exit(1)
  }

  try {
    const start = Date.now()
    const db = createAdminClient()
    const { count, error } = await db.from("profiles").select("*", { count: "exact", head: true })
    if (error) throw error
    console.log(`\nOK — connected (${Date.now() - start}ms), profiles: ${count ?? 0}\n`)
  } catch (error) {
    console.error("\nFAILED —", getDatabaseErrorMessage(error))
    console.error("\nSteps to fix:")
    for (const step of DATABASE_SETUP_STEPS) {
      console.error(`  • ${step}`)
    }
    console.error("")
    process.exit(1)
  }
}

main()
