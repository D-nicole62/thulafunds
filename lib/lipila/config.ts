/**
 * Lipila payment gateway config (Zambian mobile money + card collections).
 * Docs: https://docs.lipila.dev/docs/collections/collections.html
 *
 * Secrets (LIPILA_API_KEY) are server-only — never expose to the client.
 */

export const LIPILA_API_BASE = process.env.LIPILA_API_BASE || "https://api.lipila.dev"
export const LIPILA_API_KEY = process.env.LIPILA_API_KEY || ""
export const LIPILA_CALLBACK_URL = process.env.LIPILA_CALLBACK_URL || ""

/** Currency Lipila collects in (Zambian Kwacha by default). Safe to expose. */
export const LIPILA_CURRENCY = process.env.NEXT_PUBLIC_LIPILA_CURRENCY || "ZMW"

export const LIPILA_ENDPOINTS = {
  momo: `${LIPILA_API_BASE}/api/v1/collections/mobile-money`,
  card: `${LIPILA_API_BASE}/api/v1/collections/card`,
  status: `${LIPILA_API_BASE}/api/v1/collections/check-status`,
} as const

export type LipilaCollectionType = "momo" | "card"

/** Lipila reports these in the check-status response `status` field. */
export function isLipilaSuccess(status?: string | null): boolean {
  if (!status) return false
  return ["successful", "success", "completed"].includes(status.toLowerCase())
}

export function isLipilaFailure(status?: string | null): boolean {
  if (!status) return false
  return ["failed", "failure", "cancelled", "canceled", "rejected", "error"].includes(
    status.toLowerCase(),
  )
}

/** Normalise a Zambian MSISDN to the 2609XXXXXXXX form Lipila expects. */
export function normalizeZambianMsisdn(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.startsWith("260")) return digits
  if (digits.startsWith("0")) return `260${digits.slice(1)}`
  if (digits.length === 9) return `260${digits}`
  return digits
}
