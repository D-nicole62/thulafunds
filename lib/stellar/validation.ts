import { StrKey } from "@stellar/stellar-sdk"

export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false
  return StrKey.isValidEd25519PublicKey(address.trim())
}

export function normalizeStellarAddress(address: string): string {
  return address.trim()
}

export function toStellarAmount(usdAmount: number): string {
  return usdAmount.toFixed(7)
}
