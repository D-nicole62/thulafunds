import { prisma } from "@/lib/prisma"
import { getCrowdfundBalance } from "@/lib/stellar/soroban"
import { verifyTransactionOnHorizon } from "@/lib/stellar/server"

/**
 * Sync on-chain escrow balance → Supabase cache (current_amount).
 * Progress bars should read live from Soroban RPC; this keeps DB in sync for lists/dashboard.
 */
export async function syncCampaignBalance(campaignId: string): Promise<number> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { contract_address: true },
  })

  if (!campaign?.contract_address) {
    throw new Error("Campaign has no Soroban contract address")
  }

  const onChainBalance = await getCrowdfundBalance(campaign.contract_address)

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      on_chain_balance: onChainBalance,
      current_amount: onChainBalance,
      updated_at: new Date(),
    },
  })

  return onChainBalance
}

export async function syncAllCampaignBalances(): Promise<number> {
  const campaigns = await prisma.campaign.findMany({
    where: { contract_address: { not: null }, status: "active" },
    select: { id: true },
  })

  let synced = 0
  for (const campaign of campaigns) {
    try {
      await syncCampaignBalance(campaign.id)
      synced++
    } catch (error) {
      console.error(`Indexer: failed to sync campaign ${campaign.id}:`, error)
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
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { contract_address: true },
  })

  if (!campaign?.contract_address) {
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

  const existing = await prisma.donation.findUnique({ where: { tx_hash: txHash } })
  if (existing) return

  await prisma.$transaction([
    prisma.donation.create({
      data: {
        campaign_id: campaignId,
        contributor_id: contributorId,
        amount,
        message: message || null,
        anonymous: anonymous || false,
        tx_hash: txHash,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { updated_at: new Date() },
    }),
  ])

  await syncCampaignBalance(campaignId)
}
