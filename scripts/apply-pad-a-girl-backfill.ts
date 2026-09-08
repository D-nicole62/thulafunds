/**
 * Applies Pad A Girl Lipila reconciliation via Supabase REST (curl).
 * Run: npx tsx scripts/apply-pad-a-girl-backfill.ts
 */
import "dotenv/config"
import { execFileSync } from "child_process"
import { randomUUID } from "crypto"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CAMPAIGN_ID = "31cfdcbd-0eb4-4a4c-a2b8-2a0a40c6715a"
const TX_HASH = "lipila-reconcile-pad-a-girl-20260308"

function curlJson(args: string[]): unknown {
  const out = execFileSync("curl", ["-sS", ...args], { encoding: "utf8" })
  if (!out.trim()) return null
  try {
    return JSON.parse(out) as unknown
  } catch {
    return out
  }
}

function supabaseRequest(method: string, path: string, body?: unknown): unknown {
  const args = [
    "-X",
    method,
    "-H",
    `apikey: ${SERVICE_KEY}`,
    "-H",
    `Authorization: Bearer ${SERVICE_KEY}`,
    "-H",
    "Content-Type: application/json",
  ]
  if (method === "POST" || method === "PATCH") {
    args.push("-H", "Prefer: return=representation")
  }
  if (body !== undefined) {
    args.push("-d", JSON.stringify(body))
  }
  args.push(`${SUPABASE_URL}${path}`)
  return curlJson(args)
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    process.exit(1)
  }

  console.log("\nPad A Girl — applying Lipila total backfill (K107)\n")

  const campaignBefore = supabaseRequest(
    "GET",
    `/rest/v1/campaigns?id=eq.${CAMPAIGN_ID}&select=title,goal_amount,current_amount,creator_id`,
  ) as Array<{ title: string; goal_amount: number; current_amount: number; creator_id: string }>

  const creatorId = campaignBefore?.[0]?.creator_id
  if (!creatorId) {
    console.error("Campaign not found or missing creator_id:", campaignBefore)
    process.exit(1)
  }

  const existing = supabaseRequest(
    "GET",
    `/rest/v1/donations?tx_hash=eq.${encodeURIComponent(TX_HASH)}&select=id,amount`,
  ) as Array<{ id: string; amount: number }> | null

  if (Array.isArray(existing) && existing.length > 0) {
    console.log("Reconcile donation already exists:", existing[0].id)
  } else {
    const inserted = supabaseRequest("POST", "/rest/v1/donations", {
      id: randomUUID(),
      campaign_id: CAMPAIGN_ID,
      contributor_id: creatorId,
      amount: 106,
      message: "Historical Lipila donations reconciled to Lipila wallet total (K107)",
      anonymous: true,
      tx_hash: TX_HASH,
      payment_method: "lipila",
      status: "completed",
      currency: "ZMW",
    })
    if (inserted && typeof inserted === "object" && "code" in (inserted as object)) {
      console.error("Insert failed:", inserted)
      process.exit(1)
    }
    console.log("Inserted reconcile donation (K106)")
  }

  const donations = supabaseRequest(
    "GET",
    `/rest/v1/donations?campaign_id=eq.${CAMPAIGN_ID}&select=amount,status`,
  ) as Array<{ amount: number; status: string | null }>

  const total = (donations ?? [])
    .filter((d) => !d.status || d.status === "completed")
    .reduce((sum, d) => sum + Number(d.amount), 0)

  const patched = supabaseRequest("PATCH", `/rest/v1/campaigns?id=eq.${CAMPAIGN_ID}`, {
    current_amount: total,
  }) as Array<{ title: string; goal_amount: number; current_amount: number }>

  const campaign = patched?.[0]
  if (!campaign) {
    console.error("Campaign patch failed:", patched)
    process.exit(1)
  }

  console.log("\nDone:")
  console.log(`  Campaign: ${campaign.title}`)
  console.log(`  Raised:   K ${Number(campaign.current_amount).toFixed(2)}`)
  console.log(`  Goal:     K ${Number(campaign.goal_amount).toFixed(2)}`)
  console.log(
    `  Status:   ${Number(campaign.current_amount) >= Number(campaign.goal_amount) ? "Goal reached" : "In progress"}`,
  )
  console.log(`\nRefresh: https://www.thulafunds.com/campaigns/${CAMPAIGN_ID}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
