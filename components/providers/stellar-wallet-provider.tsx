"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  getStellarNetwork,
} from "@/lib/stellar/config"
import {
  type WalletType,
  connectWallet as connectWalletAdapter,
  signWithWallet,
  checkFreighterConnected,
} from "@/lib/stellar/wallets"
import { coerceStellarAddress } from "@/lib/stellar/validation"

interface StellarWalletContextType {
  address: string | null
  isConnected: boolean
  isReady: boolean
  balance: string | null
  xlmBalance: string | null
  accountExists: boolean
  needsFunding: boolean
  networkName: string
  walletType: WalletType
  setWalletType: (type: WalletType) => void
  connectWallet: (type?: WalletType) => Promise<string>
  disconnectWallet: () => void
  refreshBalance: () => Promise<void>
  fundTestnetAccount: () => Promise<void>
  signTransaction: (xdr: string) => Promise<string>
  error: string | null
}

const StellarWalletContext = createContext<StellarWalletContextType>({
  address: null,
  isConnected: false,
  isReady: false,
  balance: null,
  xlmBalance: null,
  accountExists: true,
  needsFunding: false,
  networkName: "Stellar Mainnet",
  walletType: "freighter",
  setWalletType: () => {},
  connectWallet: async () => {
    throw new Error("Wallet provider not ready")
  },
  disconnectWallet: () => {},
  refreshBalance: async () => {},
  fundTestnetAccount: async () => {},
  signTransaction: async () => {
    throw new Error("Wallet not connected")
  },
  error: null,
})

export const useStellarWallet = () => useContext(StellarWalletContext)

async function fetchBalancesFromApi(address: string): Promise<{
  usdc: string
  xlm: string
  exists: boolean
  needsFunding: boolean
}> {
  const res = await fetch(`/api/stellar/account?address=${encodeURIComponent(address)}`)
  if (!res.ok) {
    return { usdc: "0", xlm: "0", exists: false, needsFunding: true }
  }
  const data = await res.json()
  return {
    usdc: data.usdc ?? "0",
    xlm: data.xlm ?? "0",
    exists: Boolean(data.exists),
    needsFunding: Boolean(data.needsFunding),
  }
}

export function StellarWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [xlmBalance, setXlmBalance] = useState<string | null>(null)
  const [accountExists, setAccountExists] = useState(true)
  const [needsFunding, setNeedsFunding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>("freighter")

  const network = getStellarNetwork()

  const applyBalanceResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchBalancesFromApi>>) => {
      setBalance(result.usdc)
      setXlmBalance(result.xlm)
      setAccountExists(result.exists)
      setNeedsFunding(result.needsFunding)
      if (result.needsFunding && network.id === "testnet") {
        setError(
          "This wallet is not funded on Stellar testnet yet. Fund it with test XLM to send transactions.",
        )
      } else if (result.needsFunding) {
        setError("This wallet account does not exist on the network yet.")
      } else {
        setError(null)
      }
    },
    [network.id],
  )

  const refreshBalance = useCallback(async () => {
    if (!address) return
    const result = await fetchBalancesFromApi(address)
    applyBalanceResult(result)
  }, [address, applyBalanceResult])

  const fundTestnetAccount = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected")
    setError(null)
    const res = await fetch("/api/stellar/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to fund account")
    }
    applyBalanceResult(data)
  }, [address, applyBalanceResult])

  useEffect(() => {
    setMounted(true)
    checkFreighterConnected().then(async (pubkey) => {
      const normalized = coerceStellarAddress(pubkey)
      if (normalized) {
        setAddress(normalized)
        setIsConnected(true)
        const result = await fetchBalancesFromApi(normalized)
        applyBalanceResult(result)
      }
    })
  }, [applyBalanceResult])

  const connectWallet = async (type?: WalletType): Promise<string> => {
    setError(null)
    const selected = type || walletType

    try {
      const publicKey = await connectWalletAdapter(selected)
      const normalized = coerceStellarAddress(publicKey)
      if (!normalized) throw new Error("Invalid wallet address returned")
      setWalletType(selected)
      setAddress(normalized)
      setIsConnected(true)

      const result = await fetchBalancesFromApi(normalized)
      applyBalanceResult(result)

      return normalized
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(message)
      throw new Error(message)
    }
  }

  const signTransaction = async (xdr: string): Promise<string> => {
    if (!address) throw new Error("Wallet not connected")
    if (needsFunding) {
      throw new Error(
        network.id === "testnet"
          ? "Fund your testnet wallet with XLM first (use the Fund Testnet Account button)."
          : "Your wallet account is not active on this network.",
      )
    }
    return signWithWallet(xdr, address, walletType)
  }

  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    setBalance(null)
    setXlmBalance(null)
    setAccountExists(true)
    setNeedsFunding(false)
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
        isReady: isConnected && !!address && accountExists,
        balance,
        xlmBalance,
        accountExists,
        needsFunding,
        networkName: network.name,
        walletType,
        setWalletType,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        fundTestnetAccount,
        signTransaction,
        error,
      }}
    >
      {children}
    </StellarWalletContext.Provider>
  )
}
