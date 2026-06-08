"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Horizon } from "@stellar/stellar-sdk"
import {
  getStellarNetwork,
  USDC_ASSET_CODE,
  USDC_ISSUER,
} from "@/lib/stellar/config"
import {
  type WalletType,
  connectWallet as connectWalletAdapter,
  signWithWallet,
  checkFreighterConnected,
} from "@/lib/stellar/wallets"

interface StellarWalletContextType {
  address: string | null
  isConnected: boolean
  isReady: boolean
  balance: string | null
  xlmBalance: string | null
  networkName: string
  walletType: WalletType
  setWalletType: (type: WalletType) => void
  connectWallet: (type?: WalletType) => Promise<string>
  disconnectWallet: () => void
  refreshBalance: () => Promise<void>
  signTransaction: (xdr: string) => Promise<string>
  error: string | null
}

const StellarWalletContext = createContext<StellarWalletContextType>({
  address: null,
  isConnected: false,
  isReady: false,
  balance: null,
  xlmBalance: null,
  networkName: "Stellar Mainnet",
  walletType: "freighter",
  setWalletType: () => {},
  connectWallet: async () => {
    throw new Error("Wallet provider not ready")
  },
  disconnectWallet: () => {},
  refreshBalance: async () => {},
  signTransaction: async () => {
    throw new Error("Wallet not connected")
  },
  error: null,
})

export const useStellarWallet = () => useContext(StellarWalletContext)

async function fetchBalances(address: string): Promise<{ usdc: string; xlm: string }> {
  const network = getStellarNetwork()
  const server = new Horizon.Server(network.horizonUrl)

  try {
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
      usdc: usdc && "balance" in usdc ? usdc.balance : "0",
      xlm: xlm && "balance" in xlm ? xlm.balance : "0",
    }
  } catch {
    return { usdc: "0", xlm: "0" }
  }
}

export function StellarWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [xlmBalance, setXlmBalance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>("freighter")

  const network = getStellarNetwork()

  const refreshBalance = useCallback(async () => {
    if (!address) return
    const balances = await fetchBalances(address)
    setBalance(balances.usdc)
    setXlmBalance(balances.xlm)
  }, [address])

  useEffect(() => {
    setMounted(true)
    checkFreighterConnected().then(async (pubkey) => {
      if (pubkey) {
        setAddress(pubkey)
        setIsConnected(true)
        const balances = await fetchBalances(pubkey)
        setBalance(balances.usdc)
        setXlmBalance(balances.xlm)
      }
    })
  }, [])

  const connectWallet = async (type?: WalletType): Promise<string> => {
    setError(null)
    const selected = type || walletType

    try {
      const publicKey = await connectWalletAdapter(selected)
      setWalletType(selected)
      setAddress(publicKey)
      setIsConnected(true)

      const balances = await fetchBalances(publicKey)
      setBalance(balances.usdc)
      setXlmBalance(balances.xlm)

      return publicKey
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(message)
      throw new Error(message)
    }
  }

  const signTransaction = async (xdr: string): Promise<string> => {
    if (!address) throw new Error("Wallet not connected")
    return signWithWallet(xdr, address, walletType)
  }

  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    setBalance(null)
    setXlmBalance(null)
    setError(null)
  }

  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return (
    <StellarWalletContext.Provider
      value={{
        address,
        isConnected,
        isReady: isConnected && !!address,
        balance,
        xlmBalance,
        networkName: network.name,
        walletType,
        setWalletType,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        signTransaction,
        error,
      }}
    >
      {children}
    </StellarWalletContext.Provider>
  )
}
