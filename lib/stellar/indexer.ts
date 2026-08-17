import { createAdminClient } from "@/lib/supabase/admin"
import { getCrowdfundBalance } from "@/lib/stellar/soroban"
import { verifyTransactionOnHorizon } from "@/lib/stellar/server"
import { insertDonation, nowIso } from "@/lib/db/helpers"

/**
 * Sync on-chain escrow balance → Supabase cache (current_amount).
 * Progress bars should read live from Soroban RPC; this keeps DB in sync for lists/dashboard.
 */
export async function syncCampaignBalance(campaignId: string): Promise<number> {
  const db = createAdminClient()
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("contract_address")
    .eq("id", campaignId)
    .single()

  if (error || !campaign?.contract_address) {
    throw new Error("Campaign has no Soroban contract address")
  }

  const onChainBalance = await getCrowdfundBalance(campaign.contract_address)

  const { error: updateError } = await db
    .from("campaigns")
    .update({
      on_chain_balance: onChainBalance,
      current_amount: onChainBalance,
      updated_at: nowIso(),
    })
    .eq("id", campaignId)

  if (updateError) throw updateError

  return onChainBalance
}

export async function syncAllCampaignBalances(): Promise<number> {
  const db = createAdminClient()
  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("id")
    .eq("status", "active")
    .not("contract_address", "is", null)

  if (error) throw error

  let synced = 0
  for (const campaign of campaigns ?? []) {
    try {
      await syncCampaignBalance(campaign.id)
      synced++
    } catch (err) {
      console.error(`Indexer: failed to sync campaign ${campaign.id}:`, err)
    }
  }
  return synced
}

/**
 * Verify a donation tx on Horizon + Soroban, then record in donations table.
 */
export async function indexDonationFromTx(
  campaignId: string,
  txHash: string,
  contributorId: string,
  amount: number,
  message?: string,
  anonymous?: boolean,
): Promise<void> {
  const db = createAdminClient()
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("contract_address")
    .eq("id", campaignId)
    .single()

  if (error || !campaign?.contract_address) {
    throw new Error("Campaign contract not found")
  }

  const verification = await verifyTransactionOnHorizon(
    txHash,
    campaign.contract_address,
    amount,
  )

  if (!verification.verified) {
    throw new Error(verification.error || "Transaction verification failed")
  }

  const { data: existing } = await db.from("donations").select("id").eq("tx_hash", txHash).maybeSingle()
  if (existing) return

  await insertDonation({
    campaign_id: campaignId,
    contributor_id: contributorId,
    amount,
    message: message || null,
    anonymous: anonymous || false,
    tx_hash: txHash,
  })

  await db.from("campaigns").update({ updated_at: nowIso() }).eq("id", campaignId)
  await syncCampaignBalance(campaignId)
}

/** Verify a direct USDC payment to the organizer wallet (no Soroban escrow). */
export async function indexDirectDonationFromTx(
  campaignId: string,
  txHash: string,
  contributorId: string,
  amount: number,
  message?: string,
  anonymous?: boolean,
): Promise<void> {
  const db = createAdminClient()
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("wallet_address, current_amount")
    .eq("id", campaignId)
    .single()

  if (error || !campaign?.wallet_address) {
    throw new Error("Campaign has no recipient wallet")
  }

  const verification = await verifyTransactionOnHorizon(
    txHash,
    campaign.wallet_address,
    amount,
  )

  if (!verification.verified) {
    throw new Error(verification.error || "Transaction verification failed")
  }

  const { data: existing } = await db.from("donations").select("id").eq("tx_hash", txHash).maybeSingle()
  if (existing) return

  await insertDonation({
    campaign_id: campaignId,
    contributor_id: contributorId,
    amount,
    message: message || null,
    anonymous: anonymous || false,
    tx_hash: txHash,
    payment_method: "stellar_direct",
    status: "completed",
    currency: "USDC",
  })

  await db.from("campaigns").update({ updated_at: nowIso() }).eq("id", campaignId)
}
