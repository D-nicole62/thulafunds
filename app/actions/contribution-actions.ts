"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { indexDonationFromTx } from "@/lib/stellar/indexer"

/** Record an on-chain donation after Soroban deposit() tx is confirmed */
export async function recordDonation(
  campaignId: string,
  txHash: string,
  amount: number,
  message?: string,
  anonymous?: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("User not authenticated")

  await indexDonationFromTx(campaignId, txHash, user.id, amount, message, anonymous)

  revalidatePath("/dashboard")
  revalidatePath("/campaigns")
  revalidatePath(`/campaigns/${campaignId}`)

  return prisma.donation.findUnique({ where: { tx_hash: txHash } })
}

export async function getDonationHistory(userId: string) {
  const donations = await prisma.donation.findMany({
    where: { contributor_id: userId },
    include: {
      campaign: {
        select: { id: true, title: true, image_url: true },
      },
    },
    orderBy: { created_at: "desc" },
  })

  return donations.map((d) => {
    const { campaign, ...rest } = d
    return { ...rest, amount: Number(rest.amount), campaigns: campaign }
  })
}

/** @deprecated Use recordDonation */
export const createContribution = recordDonation
export const getContributionHistory = getDonationHistory
