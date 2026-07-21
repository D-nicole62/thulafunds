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
import {
  getFreighterNetworkMismatch,
  isFreighterNetworkMismatchError,
  FreighterNetworkMismatchError,
} from "@/lib/stellar/freighter-network"

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
  networkMismatch: {
    appNetworkName: string
    freighterNetworkName: string
  } | null
  refreshFreighterNetwork: () => Promise<void>
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
  networkMismatch: null,
  refreshFreighterNetwork: async () => {},
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
  const [networkMismatch, setNetworkMismatch] = useState<{
    appNetworkName: string
    freighterNetworkName: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>("freighter")

  const network = getStellarNetwork()

  const refreshFreighterNetwork = useCallback(async () => {
    if (walletType !== "freighter") {
      setNetworkMismatch(null)
      return
    }
    const mismatch = await getFreighterNetworkMismatch()
    setNetworkMismatch(mismatch)
    if (mismatch) {
      setError(
        mismatch.appNetworkName.includes("Test")
          ? "Switch Freighter to Test Net to use this app."
          : "Switch Freighter to Main Net to use this app.",
      )
    }
  }, [walletType])

  const applyBalanceResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchBalancesFromApi>>) => {
      setBalance(result.usdc)
      setXlmBalance(result.xlm)
      setAccountExists(result.exists)
      setNeedsFunding(result.needsFunding)
      if (networkMismatch) return
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
    [network.id, networkMismatch],
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
        await refreshFreighterNetwork()
        const result = await fetchBalancesFromApi(normalized)
        applyBalanceResult(result)
      }
    })
  }, [applyBalanceResult, refreshFreighterNetwork])

  useEffect(() => {
    if (isConnected && walletType === "freighter") {
      void refreshFreighterNetwork()
    }
  }, [isConnected, walletType, refreshFreighterNetwork])

  const connectWallet = async (type?: WalletType): Promise<string> => {
    setError(null)
    setNetworkMismatch(null)
    const selected = type || walletType

    try {
      const publicKey = await connectWalletAdapter(selected)
      const normalized = coerceStellarAddress(publicKey)
      if (!normalized) throw new Error("Invalid wallet address returned")
      setWalletType(selected)
      setAddress(normalized)
      setIsConnected(true)

      await refreshFreighterNetwork()
      const result = await fetchBalancesFromApi(normalized)
      applyBalanceResult(result)

      return normalized
    } catch (err: unknown) {
      if (isFreighterNetworkMismatchError(err)) {
        setNetworkMismatch({
          appNetworkName: err.appNetworkName,
          freighterNetworkName: err.freighterNetworkName,
        })
      }
      const message = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(message)
      throw new Error(message)
    }
  }

  const signTransaction = async (xdr: string): Promise<string> => {
    if (!address) throw new Error("Wallet not connected")
    if (networkMismatch) {
      throw new FreighterNetworkMismatchError(
        networkMismatch.appNetworkName,
        networkMismatch.freighterNetworkName,
      )
    }
    if (needsFunding) {
      throw new Error(
        network.id === "testnet"
          ? "Fund your testnet wallet with XLM first (use the Fund Testnet Account button)."
          : "Your wallet account is not active on this network.",
      )
    }
    try {
      return await signWithWallet(xdr, address, walletType)
    } catch (err: unknown) {
      if (isFreighterNetworkMismatchError(err)) {
        setNetworkMismatch({
          appNetworkName: err.appNetworkName,
          freighterNetworkName: err.freighterNetworkName,
        })
      }
      throw err
    }
  }

  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    setBalance(null)
    setXlmBalance(null)
    setAccountExists(true)
    setNeedsFunding(false)
    setNetworkMismatch(null)
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
        isReady: isConnected && !!address && accountExists && !networkMismatch,
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
        networkMismatch,
        refreshFreighterNetwork,
      }}
    >
      {children}
    </StellarWalletContext.Provider>
  )
}
