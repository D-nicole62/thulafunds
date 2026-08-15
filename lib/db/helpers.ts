import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile } from "@/lib/db/types"

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
