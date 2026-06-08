"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import {
  getStellarNetwork,
  USDC_ASSET_CODE,
  USDC_ISSUER,
  getTxExplorerUrl,
} from "@/lib/stellar/config"
import {
  invokeDeposit,
  invokeWithdraw,
  invokeRefund,
} from "@/lib/stellar/soroban"

interface OnchainContextType {
  paymentStatus: "idle" | "pending" | "completed" | "failed"
  /** Soroban crowdfund.deposit() — funds held in on-chain escrow */
  deposit: (amount: string, contractAddress: string, campaignId: string) => Promise<{
    success: boolean
    txHash: string
    explorerUrl: string
    status: "completed"
  }>
  /** Organizer withdraw() when goal met */
  withdraw: (contractAddress: string) => Promise<{ txHash: string; explorerUrl: string }>
  /** Donor refund() on expired campaign */
  refund: (contractAddress: string) => Promise<{ txHash: string; explorerUrl: string }>
  /** @deprecated Use deposit() — kept for x402 premium/boost flows */
  makePayment: (amount: string, recipientAddress: string, campaignId: string) => Promise<{
    success: boolean
    txHash: string
    status: "completed"
  }>
  paymentHistory: PaymentRecord[]
  networkInfo: {
    name: string
    currency: string
    assetIssuer: string
    type: "soroban"
  }
  isReady: boolean
  error: string | null
  balance: string | null
}

interface PaymentRecord {
  id: string
  amount: string
  contractAddress: string
  campaignId: string
  timestamp: Date
  status: "completed" | "failed" | "pending"
  network: string
  txHash: string
}

const network = getStellarNetwork()

const defaultContext: OnchainContextType = {
  paymentStatus: "idle",
  deposit: async () => {
    throw new Error("Payment system not available")
  },
  withdraw: async () => {
    throw new Error("Withdraw not available")
  },
  refund: async () => {
    throw new Error("Refund not available")
  },
  makePayment: async () => {
    throw new Error("Payment system not available")
  },
  paymentHistory: [],
  networkInfo: {
    name: network.name,
    currency: USDC_ASSET_CODE,
    assetIssuer: USDC_ISSUER,
    type: "soroban",
  },
  isReady: false,
  error: null,
  balance: null,
}

const OnchainContext = createContext<OnchainContextType>(defaultContext)

export const useOnchain = () => useContext(OnchainContext)

function OnchainProviderInner({ children }: { children: ReactNode }) {
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle")
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const { address, isConnected, isReady, balance, refreshBalance, signTransaction, error: walletError } =
    useStellarWallet()

  const networkInfo = {
    name: network.name,
    currency: USDC_ASSET_CODE,
    assetIssuer: USDC_ISSUER,
    type: "soroban" as const,
  }

  useEffect(() => {
    if (walletError) setError(walletError)
    else if (isConnected) setError(null)
  }, [walletError, isConnected])

  const deposit = async (amountStr: string, contractAddress: string, campaignId: string) => {
    if (!isConnected || !address) {
      throw new Error("Connect your Stellar wallet (Freighter, Albedo, or xBull)")
    }

    const cleanAmount = amountStr.replace("$", "")
    const amountNum = parseFloat(cleanAmount)
    if (isNaN(amountNum) || amountNum < 0.01) {
      throw new Error("Minimum donation is $0.01")
    }
    if (balance && parseFloat(balance) < amountNum) {
      throw new Error("Insufficient USDC balance")
    }

    setPaymentStatus("pending")
    setError(null)

    try {
      const txHash = await invokeDeposit(
        contractAddress,
        address,
        amountNum,
        signTransaction,
      )

      const record: PaymentRecord = {
        id: crypto.randomUUID(),
        amount: amountStr,
        contractAddress,
        campaignId,
        timestamp: new Date(),
        status: "completed",
        network: network.name,
        txHash,
      }
      setPaymentHistory((prev) => [record, ...prev])
      setPaymentStatus("completed")
      await refreshBalance()

      return {
        success: true,
        txHash,
        explorerUrl: getTxExplorerUrl(txHash),
        status: "completed" as const,
      }
    } catch (err: unknown) {
      setPaymentStatus("failed")
      const msg = err instanceof Error ? err.message : "Deposit failed"
      setError(msg)
      throw new Error(msg)
    }
  }

  const withdraw = async (contractAddress: string) => {
    if (!address) throw new Error("Wallet not connected")
    const txHash = await invokeWithdraw(contractAddress, address, signTransaction)
    return { txHash, explorerUrl: getTxExplorerUrl(txHash) }
  }

  const refund = async (contractAddress: string) => {
    if (!address) throw new Error("Wallet not connected")
    const txHash = await invokeRefund(contractAddress, address, signTransaction)
    return { txHash, explorerUrl: getTxExplorerUrl(txHash) }
  }

  const makePayment = async (amountStr: string, contractAddress: string, campaignId: string) => {
    const result = await deposit(amountStr, contractAddress, campaignId)
    return { success: result.success, txHash: result.txHash, status: result.status }
  }

  return (
    <OnchainContext.Provider
      value={{
        paymentStatus,
        deposit,
        withdraw,
        refund,
        makePayment,
        paymentHistory,
        networkInfo,
        isReady,
        error,
        balance,
      }}
    >
      {children}
    </OnchainContext.Provider>
  )
}

export function OnchainProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <OnchainContext.Provider value={{ ...defaultContext, error: "Loading..." }}>
        <div suppressHydrationWarning>{children}</div>
      </OnchainContext.Provider>
    )
  }

  return <OnchainProviderInner>{children}</OnchainProviderInner>
}
