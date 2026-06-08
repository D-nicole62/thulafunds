"use client"

/**
 * x402 payment provider — delegates to the Stellar onchain provider.
 * Kept for backward compatibility with any imports of useX402.
 */
export { useOnchain as useX402, OnchainProvider as X402Provider } from "@/components/providers/onchain-provider"
