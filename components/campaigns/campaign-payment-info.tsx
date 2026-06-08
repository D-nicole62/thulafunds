"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type { CampaignPaymentInfoProps } from "@/types/campaign"
import { isValidStellarAddress } from "@/lib/stellar/validation"

export function CampaignPaymentInfo({ walletAddress }: CampaignPaymentInfoProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async () => {
    if (!walletAddress) return

    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      toast({
        title: "Wallet address copied!",
        description: "The wallet address has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Copy failed:", error)
      toast({
        title: "Copy failed",
        description: "Unable to copy wallet address. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatWalletAddress = (address: string) => {
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (!walletAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No wallet address configured for this campaign.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check if wallet address is valid
  const isValidAddress = isValidStellarAddress(walletAddress)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isValidAddress && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            ⚠️ Warning: This campaign has an invalid wallet address. Contributions may fail.
          </div>
        )}
        <div className="text-sm">
          <div className="font-medium mb-1">Receiving Wallet:</div>
          <div className="flex items-center gap-2">
            <div className={`font-mono text-xs p-2 rounded flex-1 ${isValidAddress ? 'bg-muted' : 'bg-red-100 text-red-800'}`}>
              {formatWalletAddress(walletAddress)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Direct USDC payments on Stellar</div>
          <div>• No platform fees</div>
          <div>• Fast transfers on Stellar network</div>
        </div>
      </CardContent>
    </Card>
  )
} 