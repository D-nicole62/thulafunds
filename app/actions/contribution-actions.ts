"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { indexDonationFromTx } from "@/lib/stellar/indexer"
import { asNumber } from "@/lib/db/helpers"
import { isCompletedDonation } from "@/lib/format-donation"

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
  revalidatePath("/dashboard/contributions")
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

  const completed = (donations ?? []).filter((d) => isCompletedDonation(d.status))
  const campaignIds = [...new Set(completed.map((d) => d.campaign_id))]
  const { data: campaigns } =
    campaignIds.length > 0
      ? await db.from("campaigns").select("id, title, image_url, creator_id").in("id", campaignIds)
      : { data: [] }

  const creatorIds = [...new Set((campaigns ?? []).map((c) => c.creator_id))]
  const { data: creators } =
    creatorIds.length > 0
      ? await db.from("profiles").select("id, full_name, avatar_url").in("id", creatorIds)
      : { data: [] }

  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]))
  const creatorMap = new Map((creators ?? []).map((p) => [p.id, p]))

  return completed.map((d) => {
    const campaign = campaignMap.get(d.campaign_id)
    const creator = campaign ? creatorMap.get(campaign.creator_id) : null
    return {
      ...d,
      amount: asNumber(d.amount),
      campaign: campaign ? { ...campaign, creator } : null,
    }
  })
}

export async function getReceivedDonationHistory(userId: string) {
  const db = createAdminClient()
  const { data: userCampaigns, error: campaignError } = await db
    .from("campaigns")
    .select("id, title, image_url")
    .eq("creator_id", userId)

  if (campaignError) throw campaignError

  const campaignIds = (userCampaigns ?? []).map((c) => c.id)
  if (campaignIds.length === 0) return []

  const { data: donations, error } = await db
    .from("donations")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false })

  if (error) throw error

  const completed = (donations ?? []).filter((d) => isCompletedDonation(d.status))
  const contributorIds = [
    ...new Set(completed.map((d) => d.contributor_id).filter((id): id is string => Boolean(id))),
  ]
  const { data: contributors } =
    contributorIds.length > 0
      ? await db.from("profiles").select("id, full_name, avatar_url").in("id", contributorIds)
      : { data: [] }

  const campaignMap = new Map((userCampaigns ?? []).map((c) => [c.id, c]))
  const contributorMap = new Map((contributors ?? []).map((p) => [p.id, p]))

  return completed.map((d) => ({
    ...d,
    amount: asNumber(d.amount),
    campaign: campaignMap.get(d.campaign_id) ?? null,
    contributor: d.contributor_id ? contributorMap.get(d.contributor_id) ?? null : null,
  }))
}

/** @deprecated Use recordDonation */
export const createContribution = recordDonation
export const getContributionHistory = getDonationHistory
