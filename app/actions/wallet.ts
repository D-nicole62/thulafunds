'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

const WalletSchema = z.object({
    userId: z.string(),
    address: z.string().refine(isValidStellarAddress, "Invalid Stellar wallet address"),
})

export async function getUserWallet(userId: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: {
                wallet_address: true,
                wallet_type: true,
                wallet_verified: true
            }
        })

        if (profile?.wallet_address) {
            return [{
                address: profile.wallet_address,
                type: profile.wallet_type || "freighter",
                verified: profile.wallet_verified || false,
                isDefault: true
            }]
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
        await prisma.profile.update({
            where: { id: userId },
            data: {
                wallet_address: normalized,
                wallet_type: "freighter",
                wallet_verified: false,
                updated_at: new Date()
            }
        })

        revalidatePath("/dashboard/wallet")
        return { success: true }
    } catch (error) {
        console.error("Error adding wallet:", error)
        return { error: "Failed to add wallet" }
    }
}

export async function verifyWallet(userId: string, address: string) {
    try {
        await prisma.profile.update({
            where: { id: userId },
            data: {
                wallet_verified: true,
                wallet_type: "freighter",
                updated_at: new Date()
            }
        })

        revalidatePath("/dashboard/wallet")
        return { success: true }
    } catch (error) {
        console.error("Error verifying wallet:", error)
        return { error: "Failed to verify wallet" }
    }
}

export async function removeWallet(userId: string) {
    try {
        await prisma.profile.update({
            where: { id: userId },
            data: {
                wallet_address: null,
                wallet_type: null,
                wallet_verified: false,
                updated_at: new Date()
            }
        })

        revalidatePath("/dashboard/wallet")
        return { success: true }
    } catch (error) {
        console.error("Error removing wallet:", error)
        return { error: "Failed to remove wallet" }
    }
}
