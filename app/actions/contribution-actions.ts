"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { indexDonationFromTx } from "@/lib/stellar/indexer"
import { asNumber } from "@/lib/db/helpers"

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

  const db = createAdminClient()
  const { data } = await db.from("donations").select("*").eq("tx_hash", txHash).maybeSingle()
  return data
}

export async function getDonationHistory(userId: string) {
  const db = createAdminClient()
  const { data: donations, error } = await db
    .from("donations")
    .select("*")
    .eq("contributor_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const campaignIds = [...new Set((donations ?? []).map((d) => d.campaign_id))]
  const { data: campaigns } =
    campaignIds.length > 0
      ? await db.from("campaigns").select("id, title, image_url").in("id", campaignIds)
      : { data: [] }

  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]))

  return (donations ?? []).map((d) => ({
    ...d,
    amount: asNumber(d.amount),
    campaigns: campaignMap.get(d.campaign_id) ?? null,
    campaign: campaignMap.get(d.campaign_id) ?? null,
  }))
}

/** @deprecated Use recordDonation */
export const createContribution = recordDonation
export const getContributionHistory = getDonationHistory
