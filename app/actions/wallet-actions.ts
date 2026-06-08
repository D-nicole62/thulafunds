"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

export async function updateUserWallet(walletAddress: string) {
  try {
    console.log("updateUserWallet called with:", walletAddress)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      throw new Error("Invalid wallet address")
    }

    const cleanAddress = normalizeStellarAddress(walletAddress)

    if (!isValidStellarAddress(cleanAddress)) {
      throw new Error("Invalid Stellar wallet address format")
    }

    console.log("Updating profile for user:", user.id, "with wallet:", cleanAddress)

    await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        wallet_address: cleanAddress,
        wallet_type: "freighter",
        wallet_verified: true,
        updated_at: new Date(),
      },
      create: {
        id: user.id,
        wallet_address: cleanAddress,
        wallet_type: "freighter",
        wallet_verified: true,
        updated_at: new Date(),
        full_name: "Demo User",
      },
    })

    console.log("Wallet updated successfully")

    try {
      revalidatePath("/dashboard")
      revalidatePath("/profile")
      revalidatePath("/wallet")
    } catch (revalidateError) {
      console.warn("Revalidation warning:", revalidateError)
    }

    return { success: true, walletAddress: cleanAddress }
  } catch (error) {
    console.error("updateUserWallet error:", error)
    throw error
  }
}

export async function getUserWallet(userId: string) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        wallet_address: true,
        wallet_type: true,
        wallet_verified: true,
      },
    })

    return profile || null
  } catch (error) {
    console.error("getUserWallet error:", error)
    throw new Error("Failed to fetch wallet information")
  }
}

export async function validateWalletForPayments(walletAddress: string) {
  try {
    if (!walletAddress || typeof walletAddress !== "string") {
      return {
        isValid: false,
        canReceiveUSDC: false,
        error: "Invalid wallet address",
      }
    }

    const cleanAddress = normalizeStellarAddress(walletAddress)

    if (!isValidStellarAddress(cleanAddress)) {
      return {
        isValid: false,
        canReceiveUSDC: false,
        error: "Invalid Stellar wallet address format",
      }
    }

    return {
      isValid: true,
      canReceiveUSDC: true,
      network: "stellar",
      address: cleanAddress,
    }
  } catch (error) {
    console.error("validateWalletForPayments error:", error)
    return {
      isValid: false,
      canReceiveUSDC: false,
      error: "Wallet validation failed",
    }
  }
}
