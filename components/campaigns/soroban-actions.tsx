"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { getTxExplorerUrl } from "@/lib/stellar/config"
import { Loader2, ArrowDownToLine, RotateCcw } from "lucide-react"

interface SorobanActionsProps {
  contractAddress: string
  isOrganizer: boolean
  campaignStatus?: string
}

export function SorobanActions({
  contractAddress,
  isOrganizer,
  campaignStatus = "active",
}: SorobanActionsProps) {
  const { withdraw, refund } = useOnchain()
  const { isConnected } = useStellarWallet()
  const [loading, setLoading] = useState<"withdraw" | "refund" | null>(null)
  const [result, setResult] = useState<{ txHash: string; type: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleWithdraw = async () => {
    setLoading("withdraw")
    setError(null)
    try {
      const { txHash } = await withdraw(contractAddress)
      setResult({ txHash, type: "withdraw" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Withdraw failed")
    } finally {
      setLoading(null)
    }
  }

  const handleRefund = async () => {
    setLoading("refund")
    setError(null)
    try {
      const { txHash } = await refund(contractAddress)
      setResult({ txHash, type: "refund" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refund failed")
    } finally {
      setLoading(null)
    }
  }

  if (!contractAddress) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">On-Chain Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert>
            <AlertDescription>
              {result.type} confirmed.{" "}
              <a
                href={getTxExplorerUrl(result.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Stellar Expert
              </a>
            </AlertDescription>
          </Alert>
        )}
        {isOrganizer && campaignStatus === "active" && (
          <Button
            onClick={handleWithdraw}
            disabled={!isConnected || loading !== null}
            className="w-full"
            variant="outline"
          >
            {loading === "withdraw" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="mr-2 h-4 w-4" />
            )}
            Withdraw Escrow (goal met)
          </Button>
        )}
        {!isOrganizer && (
          <Button
            onClick={handleRefund}
            disabled={!isConnected || loading !== null}
            className="w-full"
            variant="outline"
          >
            {loading === "refund" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Request Refund (expired)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
