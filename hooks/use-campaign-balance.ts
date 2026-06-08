"use client"

import { useEffect, useState } from "react"

interface CampaignBalanceResult {
  balance: number
  goal: number
  loading: boolean
  error: string | null
  source: "soroban" | "cache"
  refresh: () => void
}

/** Read live escrow balance from Soroban RPC (source of truth for progress bars) */
export function useCampaignBalance(
  campaignId: string,
  contractAddress?: string | null,
  fallbackBalance?: number,
  fallbackGoal?: number,
): CampaignBalanceResult {
  const [balance, setBalance] = useState(fallbackBalance ?? 0)
  const [goal, setGoal] = useState(fallbackGoal ?? 0)
  const [loading, setLoading] = useState(!!contractAddress)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"soroban" | "cache">("cache")
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!contractAddress) {
      setBalance(fallbackBalance ?? 0)
      setGoal(fallbackGoal ?? 0)
      setSource("cache")
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/campaigns/${campaignId}/balance`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setBalance(fallbackBalance ?? 0)
          setSource("cache")
        } else {
          setBalance(data.balance)
          setGoal(data.goal)
          setSource(data.source || "soroban")
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setBalance(fallbackBalance ?? 0)
          setSource("cache")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [campaignId, contractAddress, fallbackBalance, fallbackGoal, tick])

  return {
    balance,
    goal,
    loading,
    error,
    source,
    refresh: () => setTick((t) => t + 1),
  }
}
