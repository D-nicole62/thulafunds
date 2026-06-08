"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"

interface SmartWalletConnectProps {
  onConnect?: (address: string) => void
  onReady?: () => void
  showNetworkInfo?: boolean
}

export function SmartWalletConnect({
  onConnect,
  onReady,
  showNetworkInfo = true,
}: SmartWalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const { isReady, networkInfo, error: onchainError, balance } = useOnchain()
  const { address, isConnected, connectWallet, networkName, walletType, setWalletType } = useStellarWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address && isReady) {
      onConnect?.(address)
      onReady?.()
    }
  }, [isConnected, address, isReady, onConnect, onReady])

  useEffect(() => {
    if (onchainError) {
      setError(onchainError)
    } else {
      setError(null)
    }
  }, [onchainError])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      await connectWallet()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet"

      let errorMessage = message
      if (message.toLowerCase().includes("cancelled") || message.toLowerCase().includes("canceled")) {
        errorMessage = "Wallet connection was cancelled. Please try again."
      } else if (message.toLowerCase().includes("freighter")) {
        errorMessage = message
      } else if (!message.toLowerCase().includes("install")) {
        errorMessage =
          "Please install the Freighter browser extension to connect your Stellar wallet."
      }

      setError(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isConnected && isReady) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Ready to Contribute
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="font-mono text-sm bg-white p-2 rounded border">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            {balance && (
              <div className="text-sm bg-white p-2 rounded border">
                Balance: {parseFloat(balance).toFixed(2)} USDC
              </div>
            )}
            {showNetworkInfo && (
              <div className="text-xs text-green-700">
                <div>Network: {networkInfo.name}</div>
                <div>Currency: {networkInfo.currency}</div>
              </div>
            )}
          </div>
          <div className="text-xs text-green-700">
            Your wallet is connected and ready for USDC payments on Stellar
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your Stellar wallet to donate USDC into Soroban escrow.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {(["freighter", "albedo", "xbull"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={walletType === type ? "default" : "outline"}
              size="sm"
              className="flex-1 capitalize"
              onClick={() => setWalletType(type)}
            >
              {type}
            </Button>
          ))}
        </div>

        <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect {walletType} Wallet
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Requires the Freighter browser extension</p>
          <p>Network: {networkName}</p>
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
  )
}
