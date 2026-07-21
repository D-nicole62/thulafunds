"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { isSorobanEscrowConfigured, getTxExplorerUrl } from "@/lib/stellar/config"
import { defaultCampaignDeadline } from "@/lib/stellar/campaign-deploy"
import { formatStellarAddressShort } from "@/lib/stellar/validation"
import { FreighterNetworkAlert } from "@/components/web3/freighter-network-alert"
import { isFreighterNetworkMismatchError } from "@/lib/stellar/freighter-network"
import { Loader2, Shield, ExternalLink } from "lucide-react"

interface DeployEscrowCardProps {
  campaignId: string
  goalAmount: number
  deadline?: string | null
  organizerWallet?: string | null
}

export function DeployEscrowCard({
  campaignId,
  goalAmount,
  deadline,
  organizerWallet,
}: DeployEscrowCardProps) {
  const router = useRouter()
  const { deployCampaignEscrow } = useOnchain()
  const {
    connectWallet,
    address,
    isConnected,
    needsFunding,
    fundTestnetAccount,
    networkMismatch,
  } = useStellarWallet()
  const [loading, setLoading] = useState(false)
  const [funding, setFunding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  if (!isSorobanEscrowConfigured()) return null

  const deadlineDate = deadline ? new Date(deadline) : defaultCampaignDeadline()

  const handleDeploy = async () => {
    setLoading(true)
    setError(null)
    try {
      let signer = address
      if (!isConnected || !signer) {
        signer = await connectWallet()
      }
      if (organizerWallet && signer !== organizerWallet) {
        throw new Error(
          `Connect the organizer wallet (${formatStellarAddressShort(organizerWallet)}) in Freighter.`,
        )
      }
      if (needsFunding) {
        throw new Error("Fund your testnet wallet with XLM first, then deploy escrow.")
      }
      const result = await deployCampaignEscrow(campaignId, goalAmount, deadlineDate)
      setTxHash(result.txHash)
      router.refresh()
    } catch (err: unknown) {
      if (isFreighterNetworkMismatchError(err)) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : "Escrow deployment failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFund = async () => {
    setFunding(true)
    setError(null)
    try {
      await fundTestnetAccount()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Funding failed")
    } finally {
      setFunding(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
          <Shield className="h-4 w-4" />
          Enable Soroban Escrow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-900">
          This campaign receives direct wallet payments today. Deploy an on-chain escrow so crypto
          donations are held until the goal is met or the deadline passes.
        </p>

        {networkMismatch && (
          <FreighterNetworkAlert
            appNetworkName={networkMismatch.appNetworkName}
            freighterNetworkName={networkMismatch.freighterNetworkName}
          />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {txHash && (
          <Alert>
            <AlertDescription>
              Escrow deployed.{" "}
              <a
                href={getTxExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {needsFunding && (
          <Button onClick={handleFund} disabled={funding || loading} variant="outline" className="w-full">
            {funding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Funding wallet...
              </>
            ) : (
              "Fund testnet wallet (XLM)"
            )}
          </Button>
        )}

        <Button onClick={handleDeploy} disabled={loading || funding || Boolean(networkMismatch)} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying escrow...
            </>
          ) : (
            "Deploy Soroban Escrow"
          )}
        </Button>

        <p className="text-xs text-amber-800">
          Requires Freighter on testnet. You will sign one factory transaction.
        </p>
      </CardContent>
    </Card>
  )
}
