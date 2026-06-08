"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { X402_WALLET_ADDRESS } from "@/lib/stellar/config"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Shield, 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ExternalLink
} from "lucide-react"

interface PremiumAnalyticsProps {
  campaignId: string
  currentAnalytics?: any
}

export function PremiumAnalytics({ campaignId, currentAnalytics }: PremiumAnalyticsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { paymentStatus, makePayment, networkInfo, isReady, balance } = useOnchain()
  const { isConnected, address } = useStellarWallet()

  const analyticsOptions = [
    {
      type: "basic",
      name: "Basic Analytics",
      price: "0.01",
      icon: BarChart3,
      description: "Essential campaign insights",
      features: ["View counts", "Contribution trends", "Basic demographics", "7-day history"],
      color: "bg-blue-500",
    },
    {
      type: "advanced",
      name: "Advanced Analytics",
      price: "0.03",
      icon: TrendingUp,
      description: "Comprehensive campaign analysis",
      features: ["Real-time tracking", "Geographic data", "Referral sources", "30-day history", "Export data"],
      color: "bg-purple-500",
    },
    {
      type: "premium",
      name: "Premium Analytics",
      price: "0.05",
      icon: Users,
      description: "Full analytics suite with insights",
      features: ["All advanced features", "Custom reports", "Predictive analytics", "Unlimited history", "API access"],
      color: "bg-yellow-500",
    },
  ]

  const handleAnalyticsUpgrade = async (analyticsType: string, price: string) => {
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
      // Process analytics payment through Onchain Kit
      const recipient = X402_WALLET_ADDRESS
      if (!recipient) {
        throw new Error("Payment recipient not configured")
      }
      const paymentResult = await makePayment(price, recipient, campaignId)
      
      if (paymentStatus === "completed" && paymentResult?.txHash) {
        // Create analytics upgrade record
        const response = await fetch(`/api/campaigns/${campaignId}/analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-payment-session": JSON.stringify({
              amount: parseFloat(price),
              endpoint: `/api/campaigns/${campaignId}/analytics`,
              txHash: paymentResult.txHash,
              timestamp: Date.now(),
              analyticsType,
            }),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to upgrade analytics")
        }

        setSuccess(`Analytics upgraded successfully! Transaction: ${paymentResult.txHash.slice(0, 10)}...`)
      } else {
        throw new Error("Payment was not completed successfully")
      }
    } catch (error: any) {
      console.error("Analytics payment error:", error)
      
      let errorMessage = "Failed to process analytics payment"
      
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
            <BarChart3 className="w-5 h-5" />
            Premium Analytics
          </CardTitle>
          <p className="text-sm text-gray-600">
            Get detailed insights into your campaign performance with advanced analytics powered by USDC payments.
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
              Analytics upgrades are processed in {networkInfo.currency} on {networkInfo.name}
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected ? (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to access premium analytics with instant USDC payments.
              </AlertDescription>
            </Alert>
          ) : !isReady ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please connect your Freighter wallet to purchase analytics upgrades.
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

          {/* Analytics Options */}
          <div className="grid gap-4 md:grid-cols-3">
            {analyticsOptions.map((analytics) => (
              <Card key={analytics.type} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${analytics.color}`} />
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className={`w-12 h-12 mx-auto rounded-full ${analytics.color} flex items-center justify-center`}>
                      <analytics.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{analytics.name}</h3>
                      <p className="text-sm text-gray-600">{analytics.description}</p>
                      <p className="text-2xl font-bold text-primary mt-2">${analytics.price}</p>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analytics.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleAnalyticsUpgrade(analytics.type, analytics.price)}
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
                          <DollarSign className="mr-2 h-4 w-4" />
                          Upgrade Analytics
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
