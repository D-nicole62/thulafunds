import { getNetworkDetails } from "@stellar/freighter-api"
import { getStellarNetwork } from "@/lib/stellar/config"

export class FreighterNetworkMismatchError extends Error {
  readonly appNetworkName: string
  readonly freighterNetworkName: string

  constructor(appNetworkName: string, freighterNetworkName: string) {
    super(buildFreighterNetworkMismatchMessage(appNetworkName, freighterNetworkName))
    this.name = "FreighterNetworkMismatchError"
    this.appNetworkName = appNetworkName
    this.freighterNetworkName = freighterNetworkName
  }
}

export function buildFreighterNetworkMismatchMessage(
  appNetworkName: string,
  freighterNetworkName: string,
): string {
  return `Freighter is on ${freighterNetworkName} but Thula Funds uses ${appNetworkName}. Switch networks in Freighter, then try again.`
}

export function getFreighterNetworkSwitchSteps(appNetworkName: string): string[] {
  const target = appNetworkName.includes("Test") ? "Test Net" : "Main Net"
  return [
    "Click the Freighter extension icon in your browser toolbar",
    `At the top of Freighter, open the network menu (e.g. "Main Net")`,
    `Select "${target}"`,
    "Refresh this page and retry the transaction",
  ]
}

export function isFreighterNetworkMismatchError(error: unknown): error is FreighterNetworkMismatchError {
  return error instanceof FreighterNetworkMismatchError
}

/** Returns mismatch info, or null if Freighter matches the app (or cannot be checked). */
export async function getFreighterNetworkMismatch(): Promise<{
  appNetworkName: string
  freighterNetworkName: string
} | null> {
  const expected = getStellarNetwork()
  try {
    const details = await getNetworkDetails()
    if (details.error) return null
    if (details.networkPassphrase === expected.networkPassphrase) return null
    return {
      appNetworkName: expected.name,
      freighterNetworkName: details.network || "another network",
    }
  } catch {
    return null
  }
}

export async function assertFreighterNetworkMatchesApp(): Promise<void> {
  const mismatch = await getFreighterNetworkMismatch()
  if (mismatch) {
    throw new FreighterNetworkMismatchError(
      mismatch.appNetworkName,
      mismatch.freighterNetworkName,
    )
  }
}
