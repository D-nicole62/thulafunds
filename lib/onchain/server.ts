import { getWalletInfo, verifyTransactionOnHorizon } from "@/lib/stellar/server"
import { getStellarNetwork } from "@/lib/stellar/config"
import { isValidStellarAddress } from "@/lib/stellar/validation"

export function getOnchainConfig() {
  const network = getStellarNetwork()

  return {
    network: network.id,
    horizonUrl: network.horizonUrl,
    networkPassphrase: network.networkPassphrase,
    chain: network,
  }
}

export async function getWalletInfoLegacy(address: string) {
  return getWalletInfo(address)
}

export { getWalletInfo, verifyTransactionOnHorizon, isValidStellarAddress }

export async function verifyWalletOwnership(address: string, _signature: string) {
  if (!isValidStellarAddress(address)) {
    return { verified: false, address }
  }

  return { verified: true, address }
}
