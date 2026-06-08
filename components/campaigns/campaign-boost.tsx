"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { X402_WALLET_ADDRESS } from "@/lib/stellar/config"
import { 
  Zap, 
  Star, 
  Crown, 
  Shield, 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ExternalLink
} from "lucide-react"

interface CampaignBoostProps {
  campaignId: string
  currentBoost?: string
}

export function CampaignBoost({ campaignId, currentBoost }: CampaignBoostProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { paymentStatus, makePayment, networkInfo, isReady, balance } = useOnchain()
  const { isConnected, address } = useStellarWallet()

  const boostOptions = [
    {
      type: "visibility",
      name: "Visibility Boost",
      price: "0.02",
      icon: Zap,
      description: "2x visibility for 24 hours",
      features: ["200% more views", "Higher search ranking", "24-hour duration"],
      color: "bg-blue-500",
    },
    {
      type: "featured",
      name: "Featured Placement",
      price: "0.05",
      icon: Star,
      description: "Featured on homepage for 24 hours",
      features: ["Homepage placement", "5x more views", "Priority in search"],
      color: "bg-purple-500",
    },
    {
      type: "premium",
      name: "Premium Boost",
      price: "0.10",
      icon: Crown,
      description: "Maximum exposure package",
      features: ["Homepage featured", "Social media promotion", "Email newsletter", "10x visibility"],
      color: "bg-yellow-500",
    },
  ]

  const handleBoost = async (boostType: string, price: string) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first")
      return
    }

    if (!isReady) {
      setError("Please connect your Freighter wallet to make payments")
      return
    }

    // Check USDC balance
    if (balance && parseFloat(balance) < parseFloat(price)) {
      setError("Insufficient USDC balance")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Process boost payment through Onchain Kit
      const recipient = X402_WALLET_ADDRESS
      if (!recipient) {
        throw new Error("Payment recipient not configured")
      }
      const paymentResult = await makePayment(price, recipient, campaignId)
      
      if (paymentStatus === "completed" && paymentResult?.txHash) {
        // Create boost record
        const response = await fetch(`/api/campaigns/${campaignId}/boost`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-payment-session": JSON.stringify({
              amount: parseFloat(price),
              endpoint: `/api/campaigns/${campaignId}/boost`,
              txHash: paymentResult.txHash,
              timestamp: Date.now(),
              boostType,
            }),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to apply boost")
        }

        setSuccess(`Boost applied successfully! Transaction: ${paymentResult.txHash.slice(0, 10)}...`)
      } else {
        throw new Error("Payment was not completed successfully")
      }
    } catch (error: any) {
      console.error("Boost payment error:", error)
      
      let errorMessage = "Failed to process boost payment"
      
      if (error.message.includes("User rejected")) {
        errorMessage = "Transaction was cancelled. Please try again."
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient USDC balance. Please check your wallet."
      } else if (error.message.includes("network")) {
        errorMessage = "Please ensure your Freighter wallet is connected to Stellar."
      } else if (error.message.includes("wallet")) {
        errorMessage = "Wallet connection issue. Please reconnect your wallet."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Boost Your Campaign
          </CardTitle>
          <p className="text-sm text-gray-600">
            Increase your campaign's visibility and reach more potential contributors with USDC payments.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Payment Network: {networkInfo.name}</span>
            </div>
            <p className="text-sm text-blue-800">
              Boost payments are processed in {networkInfo.currency} on {networkInfo.name}
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected ? (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to boost your campaign with instant USDC payments.
              </AlertDescription>
            </Alert>
          ) : !isReady ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please connect your Freighter wallet to make boost payments.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Wallet connected and ready for payments on {networkInfo.name}
                {balance && ` • Balance: ${parseFloat(balance).toFixed(2)} USDC`}
              </AlertDescription>
            </Alert>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Boost Options */}
          <div className="grid gap-4 md:grid-cols-3">
            {boostOptions.map((boost) => (
              <Card key={boost.type} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${boost.color}`} />
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className={`w-12 h-12 mx-auto rounded-full ${boost.color} flex items-center justify-center`}>
                      <boost.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{boost.name}</h3>
                      <p className="text-sm text-gray-600">{boost.description}</p>
                      <p className="text-2xl font-bold text-primary mt-2">${boost.price}</p>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {boost.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleBoost(boost.type, boost.price)}
                      disabled={loading || !isConnected || !isReady}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Boost Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Powered by Stellar blockchain</p>
            <a 
              href="https://www.freighter.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Get Freighter <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
