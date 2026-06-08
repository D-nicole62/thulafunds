"use server"

import { getWalletInfo } from "@/lib/stellar/server"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

export async function getWalletInfoAction(address: string) {
  try {
    const normalized = normalizeStellarAddress(address)

    if (!isValidStellarAddress(normalized)) {
      return null
    }

    const info = await getWalletInfo(normalized)

    return {
      address: normalized,
      balance: info?.balance || "0",
      network: info?.network || "Stellar",
      isValid: true,
    }
  } catch (error) {
    console.error("Failed to fetch wallet info:", error)
    return null
  }
}

export async function verifyWalletOwnershipAction(address: string, _signature: string) {
  try {
    const normalized = normalizeStellarAddress(address)

    return {
      verified: isValidStellarAddress(normalized),
      address: normalized,
    }
  } catch (error) {
    console.error("Failed to verify wallet:", error)
    return {
      verified: false,
      address,
    }
  }
}
