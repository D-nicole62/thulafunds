export type StellarNetworkId = "public" | "testnet"

const STELLAR_NETWORKS = {
  public: {
    id: "public" as const,
    name: "Stellar Mainnet",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://mainnet.sorobanrpc.com",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    explorerBase: "https://stellar.expert/explorer/public",
  },
  testnet: {
    id: "testnet" as const,
    name: "Stellar Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    explorerBase: "https://stellar.expert/explorer/testnet",
  },
} as const

export function getStellarNetwork(): (typeof STELLAR_NETWORKS)[StellarNetworkId] {
  const envNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK
  const networkId: StellarNetworkId = envNetwork === "testnet" ? "testnet" : "public"
  return STELLAR_NETWORKS[networkId]
}

export function getSorobanRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || getStellarNetwork().sorobanRpcUrl
  )
}

/** Testnet USDC (Stellar testnet faucet asset) */
const TESTNET_USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
const TESTNET_USDC_SAC =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

/** Mainnet Circle USDC issuer */
const MAINNET_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5R43SA4Q"

function isTestnetEnv(): boolean {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "testnet"
}

/** Circle USDC issuer on mainnet; testnet USDC when NEXT_PUBLIC_STELLAR_NETWORK=testnet */
export const USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER?.trim() ||
  (isTestnetEnv() ? TESTNET_USDC_ISSUER : MAINNET_USDC_ISSUER)

export const USDC_ASSET_CODE = "USDC"

/** Soroban Stellar Asset Contract (SAC) for USDC */
export const USDC_CONTRACT_ID =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ID?.trim() ||
  (isTestnetEnv() ? TESTNET_USDC_SAC : "")

export const CAMPAIGN_FACTORY_ID =
  process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ID?.trim() || ""

export const MILESTONE_CONTRACT_ID =
  process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ID?.trim() || ""

/** True when factory + USDC SAC are configured for on-chain escrow deployment */
export function isSorobanEscrowConfigured(): boolean {
  return Boolean(CAMPAIGN_FACTORY_ID && USDC_CONTRACT_ID)
}

export const X402_WALLET_ADDRESS = process.env.NEXT_PUBLIC_X402_WALLET_ADDRESS || ""

export function getAccountExplorerUrl(address: string): string {
  const network = getStellarNetwork()
  return `${network.explorerBase}/account/${address}`
}

export function getTxExplorerUrl(txHash: string): string {
  const network = getStellarNetwork()
  return `${network.explorerBase}/tx/${txHash}`
}

export function getContractExplorerUrl(contractId: string): string {
  const network = getStellarNetwork()
  return `${network.explorerBase}/contract/${contractId}`
}

/** Stellar stroops: 1 USDC = 10^7 stroops on Soroban token interface */
export const STROOPS_PER_UNIT = 10_000_000

export function usdToStroops(amount: number): bigint {
  return BigInt(Math.round(amount * STROOPS_PER_UNIT))
}

export function stroopsToUsd(stroops: bigint | number): number {
  return Number(stroops) / STROOPS_PER_UNIT
}
