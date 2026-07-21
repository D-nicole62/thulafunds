"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { nowIso } from "@/lib/db/helpers"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

const WalletSchema = z.object({
  userId: z.string(),
  address: z.string().refine(isValidStellarAddress, "Invalid Stellar wallet address"),
})

export async function getUserWallet(userId: string) {
  try {
    const db = createAdminClient()
    const { data: profile, error } = await db
      .from("profiles")
      .select("wallet_address, wallet_type, wallet_verified")
      .eq("id", userId)
      .maybeSingle()

    if (error) throw error

    if (profile?.wallet_address) {
      return [
        {
          address: profile.wallet_address,
          type: profile.wallet_type || "freighter",
          verified: profile.wallet_verified || false,
          isDefault: true,
        },
      ]
    }

    return []
  } catch (error) {
    console.error("Error fetching user wallet:", error)
    return []
  }
}

export async function addWallet(userId: string, address: string) {
  const normalized = normalizeStellarAddress(address)
  const result = WalletSchema.safeParse({ userId, address: normalized })

  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  try {
    const db = createAdminClient()
    const { error } = await db
      .from("profiles")
      .update({
        wallet_address: normalized,
        wallet_type: "freighter",
        wallet_verified: false,
        updated_at: nowIso(),
      })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error) {
    console.error("Error adding wallet:", error)
    return { error: "Failed to add wallet" }
  }
}

export async function verifyWallet(userId: string, _address: string) {
  try {
    const db = createAdminClient()
    const { error } = await db
      .from("profiles")
      .update({
        wallet_verified: true,
        wallet_type: "freighter",
        updated_at: nowIso(),
      })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error) {
    console.error("Error verifying wallet:", error)
    return { error: "Failed to verify wallet" }
  }
}

export async function removeWallet(userId: string) {
  try {
    const db = createAdminClient()
    const { error } = await db
      .from("profiles")
      .update({
        wallet_address: null,
        wallet_type: null,
        wallet_verified: false,
        updated_at: nowIso(),
      })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error) {
    console.error("Error removing wallet:", error)
    return { error: "Failed to remove wallet" }
  }
}
