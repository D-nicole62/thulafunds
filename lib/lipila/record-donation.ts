import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { insertDonation, nowIso, syncCampaignAmountFromDonations } from "@/lib/db/helpers"
import { LIPILA_CURRENCY, isLipilaSuccess } from "@/lib/lipila/config"

export type LipilaStatusPayload = {
  referenceId?: string
  amount?: number | string
  currency?: string
  status?: string
  referenceData?: string
}

export async function recordLipilaDonationFromStatus(
  campaignId: string,
  statusData: LipilaStatusPayload,
  options: {
    contributorId?: string | null
    donorName?: string | null
    message?: string | null
    anonymous?: boolean
  } = {},
): Promise<{ created: boolean; donationId: string; amount: number }> {
  const referenceId = statusData.referenceId
  if (!referenceId) {
    throw new Error("referenceId is required")
  }

  if (!isLipilaSuccess(statusData.status)) {
    throw new Error("Payment is not confirmed yet")
  }

  const amount = Number(statusData.amount)
  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount from gateway")
  }

  const db = createAdminClient()
  const { data: existing } = await db.from("donations").select("id, amount").eq("tx_hash", referenceId).maybeSingle()
  if (existing) {
    return { created: false, donationId: existing.id, amount: Number(existing.amount) }
  }

  const donation = await insertDonation({
    campaign_id: campaignId,
    contributor_id: options.contributorId ?? null,
    donor_name: options.donorName ?? null,
    amount,
    message: options.message ?? null,
    anonymous: options.anonymous ?? false,
    tx_hash: referenceId,
    payment_method: "lipila",
    status: "completed",
    currency: statusData.currency || LIPILA_CURRENCY,
  })

  await syncCampaignAmountFromDonations(campaignId)
  await db.from("campaigns").update({ updated_at: nowIso() }).eq("id", campaignId)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/contributions")
  revalidatePath("/campaigns")
  revalidatePath(`/campaigns/${campaignId}`)

  return { created: true, donationId: donation.id, amount }
}
