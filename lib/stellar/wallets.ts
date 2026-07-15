import {
  isConnected as freighterIsConnected,
  getAddress as freighterGetAddress,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api"
import { getStellarNetwork } from "@/lib/stellar/config"

export type WalletType = "freighter" | "albedo" | "xbull"

declare global {
  interface Window {
    albedo?: {
      publicKey: (opts: { requireExisting: boolean }) => Promise<{ pubkey: string }>
      tx: (opts: { xdr: string; network: string }) => Promise<{ tx_hash: string; signed_envelope_xdr?: string }>
    }
    xBullSDK?: {
      connect: () => Promise<{ address: string }>
      sign: (xdr: string, opts: { network: string; accountToSign: string }) => Promise<string>
    }
  }
}

export async function connectWallet(type: WalletType = "freighter"): Promise<string> {
  switch (type) {
    case "freighter":
      return connectFreighter()
    case "albedo":
      return connectAlbedo()
    case "xbull":
      return connectXBull()
    default:
      return connectFreighter()
  }
}

export async function signWithWallet(
  xdr: string,
  accountToSign: string,
  type: WalletType = "freighter",
): Promise<string> {
  const network = getStellarNetwork()

  switch (type) {
    case "freighter": {
      const result = await freighterSignTransaction(xdr, {
        networkPassphrase: network.networkPassphrase,
        address: accountToSign,
      })
      if (result.error || !result.signedTxXdr) {
        throw new Error("Transaction signing was cancelled")
      }
      return result.signedTxXdr
    }
    case "albedo": {
      if (!window.albedo) throw new Error("Albedo wallet not installed")
      const result = await window.albedo.tx({
        xdr,
        network: network.networkPassphrase,
      })
      return result.signed_envelope_xdr || xdr
    }
    case "xbull": {
      if (!window.xBullSDK) throw new Error("xBull wallet not installed")
      return window.xBullSDK.sign(xdr, {
        network: network.networkPassphrase,
        accountToSign,
      })
    }
    default:
      throw new Error("Unsupported wallet")
  }
}

async function connectFreighter(): Promise<string> {
  const access = await freighterRequestAccess()
  if (access.error || !access.address) {
    throw new Error("Wallet connection was cancelled")
  }
  return access.address
}

async function connectAlbedo(): Promise<string> {
  if (!window.albedo) throw new Error("Install Albedo wallet extension")
  const { pubkey } = await window.albedo.publicKey({ requireExisting: true })
  return pubkey
}

async function connectXBull(): Promise<string> {
  if (!window.xBullSDK) throw new Error("Install xBull wallet extension")
  const { address } = await window.xBullSDK.connect()
  return address
}

export async function checkFreighterConnected(): Promise<string | null> {
  try {
    const status = await freighterIsConnected()
    if (!status.isConnected) return null
    const result = await freighterGetAddress()
    if (result.error || !result.address) return null
    return result.address
  } catch {
    return null
  }
}
