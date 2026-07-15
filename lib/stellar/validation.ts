import { StrKey } from "@stellar/stellar-sdk"

export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false
  return StrKey.isValidEd25519PublicKey(address.trim())
}

export function normalizeStellarAddress(address: string): string {
  return address.trim()
}

/** Coerce Freighter v5 `{ address }` responses (or plain strings) to a pubkey. */
export function coerceStellarAddress(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (value && typeof value === "object" && "address" in value) {
    const addr = (value as { address?: unknown }).address
    if (typeof addr === "string" && addr.trim()) return addr.trim()
  }
  return null
}

/** Short display form for a Stellar address (e.g. GABC12...XYZ4). */
export function formatStellarAddressShort(
  address: string | null | undefined,
  start = 6,
  end = 4,
): string {
  const normalized = coerceStellarAddress(address)
  if (!normalized || normalized.length <= start + end) return normalized || ""
  return `${normalized.slice(0, start)}...${normalized.slice(-end)}`
}

export function toStellarAmount(usdAmount: number): string {
  return usdAmount.toFixed(7)
}
