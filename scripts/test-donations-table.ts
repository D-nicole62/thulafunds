import "dotenv/config"
import { createAdminClient } from "../lib/supabase/admin"
import { newRowId } from "../lib/db/helpers"
import { isSupabaseConfigured } from "../lib/supabase/config"

async function probeTable(name: string) {
  const db = createAdminClient()
  const { count, error } = await db.from(name).select("*", { count: "exact", head: true })
  if (error) {
    console.log(`  ${name}: ERROR — ${error.message} (${error.code ?? "no code"})`)
    return false
  }
  console.log(`  ${name}: OK (${count ?? 0} rows)`)
  return true
}

async function probeInsert() {
  const db = createAdminClient()
  const { data: campaign } = await db.from("campaigns").select("id").limit(1).maybeSingle()
  if (!campaign) {
    console.log("  dry-run insert: skipped (no campaigns)")
    return
  }

  const testId = newRowId()
  const ref = `test-probe-${testId}`
  const row = {
    id: testId,
    campaign_id: campaign.id,
    contributor_id: null,
    amount: 0.01,
    message: null,
    anonymous: true,
    tx_hash: ref,
    payment_method: "lipila",
    status: "completed",
    currency: "ZMW",
  }

  const { error: insertError } = await db.from("donations").insert(row)
  if (insertError) {
    console.log(`  dry-run insert: FAILED — ${insertError.message} (${insertError.code ?? "no code"})`)
    console.log("  hint:", insertError.details ?? insertError.hint ?? "none")
    return
  }

  await db.from("donations").delete().eq("id", testId)
  console.log("  dry-run insert: OK (rolled back test row)")
}

async function main() {
  console.log("\nThula Funds — donations table probe\n")

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars\n")
    process.exit(1)
  }

  const hasDonations = await probeTable("donations")
  const hasContributions = await probeTable("contributions")

  if (!hasDonations && hasContributions) {
    console.log("\n⚠ Table is still named `contributions`. Run scripts/fix-donations-schema.sql in Supabase.\n")
    process.exit(1)
  }

  if (hasDonations) {
    await probeInsert()
  }

  console.log("")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
