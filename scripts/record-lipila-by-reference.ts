/**
 * Record a successful Lipila payment by reference ID (from Lipila dashboard).
 *
 * Usage:
 *   npx tsx scripts/record-lipila-by-reference.ts <campaignId> <referenceId>
 */
import "dotenv/config"
import { recordLipilaDonationFromStatus } from "../lib/lipila/record-donation"
import { LIPILA_API_KEY, LIPILA_ENDPOINTS } from "../lib/lipila/config"

async function main() {
  const [, , campaignId, referenceId] = process.argv
  if (!campaignId || !referenceId) {
    console.error("Usage: npx tsx scripts/record-lipila-by-reference.ts <campaignId> <referenceId>")
    process.exit(1)
  }
  if (!LIPILA_API_KEY) {
    console.error("Missing LIPILA_API_KEY in .env")
    process.exit(1)
  }

  const statusRes = await fetch(
    `${LIPILA_ENDPOINTS.status}?referenceId=${encodeURIComponent(referenceId)}`,
    { headers: { accept: "application/json", "x-api-key": LIPILA_API_KEY } },
  )
  const statusData = await statusRes.json().catch(() => null)
  if (!statusData) {
    console.error("Could not read payment status from Lipila")
    process.exit(1)
  }

  console.log("Lipila status:", statusData)

  const result = await recordLipilaDonationFromStatus(campaignId, statusData, { anonymous: true })
  console.log(result.created ? "Donation recorded." : "Donation already existed.", result)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
