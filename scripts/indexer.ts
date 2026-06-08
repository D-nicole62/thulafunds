import "dotenv/config"
import { syncAllCampaignBalances } from "../lib/stellar/indexer"

async function main() {
  console.log("Thula Funds — Stellar event indexer")
  console.log("Syncing on-chain escrow balances to Supabase cache...\n")

  const synced = await syncAllCampaignBalances()
  console.log(`Synced ${synced} campaign(s) from Soroban RPC`)
}

main().catch((error) => {
  console.error("Indexer failed:", error)
  process.exit(1)
})
