import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Donation, Profile } from "@/lib/db/types"

export type DonationInsert = {
  campaign_id: string
  contributor_id: string | null
  amount: number
  tx_hash: string
  donor_name?: string | null
} & Partial<Pick<Donation, "message" | "anonymous" | "payment_method" | "status" | "currency">>

export function asNumber(value: string | number | null | undefined): number {
  return Number(value ?? 0)
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Primary key for tables where Supabase/Postgres may lack a gen_random_uuid() default. */
export function newRowId(): string {
  return randomUUID()
}

/** Ensure a profile row exists for an auth user. */
export async function upsertProfile(
  userId: string,
  fields: Partial<Pick<Profile, "full_name" | "wallet_address" | "wallet_type" | "wallet_verified">> = {},
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from("profiles").upsert(
    {
      id: userId,
      full_name: fields.full_name ?? "User",
      wallet_address: fields.wallet_address ?? null,
      wallet_type: fields.wallet_type ?? null,
      wallet_verified: fields.wallet_verified ?? false,
      updated_at: nowIso(),
    },
    { onConflict: "id" },
  )
  if (error) throw error
}

/** Insert a donation row (explicit id for tables missing UUID defaults). */
export async function insertDonation(row: DonationInsert): Promise<Donation> {
  const db = createAdminClient()
  const { data, error } = await db
    .from("donations")
    .insert({
      id: newRowId(),
      campaign_id: row.campaign_id,
      contributor_id: row.contributor_id,
      donor_name: row.donor_name ?? null,
      amount: row.amount,
      message: row.message ?? null,
      anonymous: row.anonymous ?? false,
      tx_hash: row.tx_hash,
      payment_method: row.payment_method ?? "soroban_escrow",
      status: row.status ?? "completed",
      currency: row.currency ?? "USDC",
    })
    .select()
    .single()

  if (error) throw error
  return data as Donation
}

/** Set campaigns.current_amount from SUM(donations) — reliable when DB trigger is missing. */
export async function syncCampaignAmountFromDonations(campaignId: string): Promise<number> {
  const db = createAdminClient()
  const { data: donations, error: sumError } = await db
    .from("donations")
    .select("amount, status")
    .eq("campaign_id", campaignId)

  if (sumError) throw sumError

  const total = (donations ?? [])
    .filter((d) => !d.status || d.status === "completed")
    .reduce((sum, d) => sum + asNumber(d.amount), 0)

  const { error: updateError } = await db
    .from("campaigns")
    .update({ current_amount: total, updated_at: nowIso() })
    .eq("id", campaignId)

  if (updateError) throw updateError
  return total
}

/** Increment campaign.current_amount by delta. */
export async function incrementCampaignAmount(campaignId: string, delta: number): Promise<void> {
  const db = createAdminClient()
  const { data: campaign, error: fetchError } = await db
    .from("campaigns")
    .select("current_amount")
    .eq("id", campaignId)
    .single()

  if (fetchError || !campaign) throw fetchError ?? new Error("Campaign not found")

  const { error: updateError } = await db
    .from("campaigns")
    .update({
      current_amount: asNumber(campaign.current_amount) + delta,
      updated_at: nowIso(),
    })
    .eq("id", campaignId)

  if (updateError) throw updateError
}
