import { getStellarNetwork, USDC_ASSET_CODE, USDC_ISSUER } from "@/lib/stellar/config"
import { getHorizonServer } from "@/lib/stellar/server"
import { isValidStellarAddress } from "@/lib/stellar/validation"

export type AccountBalanceResult = {
  exists: boolean
  usdc: string
  xlm: string
  needsFunding: boolean
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { response?: { status?: number }; status?: number }
  return e.response?.status === 404 || e.status === 404
}

export async function fetchAccountBalances(address: string): Promise<AccountBalanceResult> {
  if (!isValidStellarAddress(address)) {
    return { exists: false, usdc: "0", xlm: "0", needsFunding: true }
  }

  try {
    const server = getHorizonServer()
    const account = await server.loadAccount(address)
    const xlm = account.balances.find((b) => b.asset_type === "native")
    const usdc = account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === USDC_ASSET_CODE &&
        b.asset_issuer === USDC_ISSUER,
    )
    return {
      exists: true,
      usdc: usdc && "balance" in usdc ? usdc.balance : "0",
      xlm: xlm && "balance" in xlm ? xlm.balance : "0",
      needsFunding: false,
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return { exists: false, usdc: "0", xlm: "0", needsFunding: true }
    }
    throw error
  }
}

/** Fund a testnet account via Stellar Friendbot (creates account with 10,000 XLM). */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const network = getStellarNetwork()
  if (network.id !== "testnet") {
    throw new Error("Friendbot funding is only available on Stellar testnet")
  }
  if (!isValidStellarAddress(publicKey)) {
    throw new Error("Invalid Stellar address")
  }

  const res = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Friendbot failed (${res.status}): ${body || "try again in a moment"}`)
  }

  // Wait for Horizon to index the new account
  const server = getHorizonServer()
  for (let i = 0; i < 10; i++) {
    try {
      await server.loadAccount(publicKey)
      return
    } catch (error) {
      if (!isNotFoundError(error)) throw error
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw new Error("Account funded but not yet visible on Horizon — wait a few seconds and refresh")
}

export function getFriendbotUrl(publicKey: string): string {
  return `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
}

export function getLaboratoryFundUrl(publicKey: string): string {
  const network = getStellarNetwork()
  const base =
    network.id === "testnet"
      ? "https://laboratory.stellar.org/#account-creator?network=test"
      : "https://laboratory.stellar.org/#account-creator?network=public"
  return `${base}&account=${encodeURIComponent(publicKey)}`
}
