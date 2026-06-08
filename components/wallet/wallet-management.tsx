"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { useAuth } from "@/components/providers"
import { isValidStellarAddress } from "@/lib/stellar/validation"
import { getAccountExplorerUrl } from "@/lib/stellar/config"
import { Wallet, Check, AlertTriangle, Copy, ExternalLink } from "lucide-react"
import { getUserWallet, addWallet as addWalletAction, verifyWallet as verifyWalletAction, removeWallet as removeWalletAction } from "@/app/actions/wallet"

interface WalletInfo {
  address: string
  type: string
  verified: boolean
  isDefault: boolean
}

export function WalletManagement() {
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { address: connectedWallet, isConnected } = useStellarWallet()
  const { user } = useAuth()

  useEffect(() => {
    loadUserWallets()
  }, [user])

  const loadUserWallets = async () => {
    if (!user) return

    try {
      const userWallets = await getUserWallet(user.id)
      setWallets(userWallets)
    } catch (error) {
      console.error("Error loading wallets:", error)
    }
  }

  const addWallet = async () => {
    if (!newWalletAddress.trim()) {
      setError("Please enter a wallet address")
      return
    }

    if (!isValidStellarAddress(newWalletAddress)) {
      setError("Invalid Stellar wallet address format (must start with G)")
      return
    }

    if (!user) {
      setError("Please log in to add a wallet")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const existingWallet = wallets.find((w) => w.address === newWalletAddress.trim())
      if (existingWallet) {
        setError("This wallet address is already added")
        return
      }

      const result = await addWalletAction(user.id, newWalletAddress.trim())

      if (result.error) {
        throw new Error(result.error)
      }

      setSuccess("Wallet added successfully!")
      setNewWalletAddress("")
      await loadUserWallets()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to add wallet")
    } finally {
      setLoading(false)
    }
  }

  const verifyWallet = async (address: string) => {
    if (!connectedWallet || address !== connectedWallet) {
      setError("Please connect the wallet you want to verify")
      return
    }

    setLoading(true)
    try {
      const result = await verifyWalletAction(user!.id, address)

      if (result.error) throw new Error(result.error)

      setSuccess("Wallet verified successfully!")
      await loadUserWallets()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to verify wallet")
    } finally {
      setLoading(false)
    }
  }

  const removeWallet = async (address: string) => {
    if (!user) return

    setLoading(true)
    try {
      const result = await removeWalletAction(user.id)

      if (result.error) throw new Error(result.error)

      setSuccess("Wallet removed successfully!")
      await loadUserWallets()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to remove wallet")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("Address copied to clipboard!")
    setTimeout(() => setSuccess(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage your Stellar receiving wallet addresses for campaign contributions and x402 payments.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 text-green-800 bg-green-50">
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add Receiving Wallet</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="wallet-address">Stellar Wallet Address</Label>
                <Input
                  id="wallet-address"
                  placeholder="G..."
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This address will receive USDC payments from your campaigns on Stellar
                </p>
              </div>
              <Button
                onClick={addWallet}
                disabled={loading || !newWalletAddress.trim()}
                className="w-full sm:w-auto"
              >
                {loading ? "Adding..." : "Add Wallet"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Wallets</h3>
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No wallets added yet</p>
                <p className="text-sm">Add a Stellar wallet address to receive payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <Card key={wallet.address} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                          </code>
                          <div className="flex gap-2">
                            {wallet.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            {wallet.verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )}
                            <Badge variant="outline">{wallet.type}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(wallet.address)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getAccountExplorerUrl(wallet.address), "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View on Stellar Expert
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!wallet.verified && isConnected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyWallet(wallet.address)}
                            disabled={loading}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWallet(wallet.address)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {isConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Connected Wallet</h4>
              <p className="text-sm text-blue-800 mb-2">
                Currently connected: <code className="font-mono">{connectedWallet}</code>
              </p>
              <p className="text-xs text-blue-700">
                You can verify your wallet ownership by ensuring this address matches one of your saved wallets.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
