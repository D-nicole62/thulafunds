"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmartWalletConnect } from "@/components/web3/smart-wallet-connect"
import { isValidStellarAddress } from "@/lib/stellar/validation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Wallet, Loader2, Plus } from "lucide-react"
import { useAuth } from "@/components/providers"
import { getUserWallet, addWallet as addWalletAction } from "@/app/actions/wallet"

interface WalletSetupStepProps {
  onComplete: (walletAddress: string) => void
  required?: boolean
}

interface UserWallet {
  address: string
  type: string
  verified: boolean
}

export function WalletSetupStep({ onComplete, required = true }: WalletSetupStepProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userWallets, setUserWallets] = useState<UserWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
    if (user) {
      loadUserWallets()
    }
  }, [user])

  const loadUserWallets = async () => {
    if (!user) return

    try {
      const wallets = await getUserWallet(user.id)

      if (wallets.length > 0) {
        setUserWallets(wallets)

        // Auto-select if only one wallet
        if (wallets.length === 1) {
          setSelectedWallet(wallets[0].address)
          handleWalletSelect(wallets[0].address)
        }
      }
    } catch (error) {
      console.error("Error loading user wallets:", error)
    }
  }

  const validateWalletAddress = (address: string): boolean => {
    return isValidStellarAddress(address)
  }

  const handleWalletSelect = (address: string) => {
    setWalletAddress(address)
    setSelectedWallet(address)
    setIsValidated(true)
    onComplete(address)
  }

  const handleWalletConnect = (address: string) => {
    console.log("Wallet connected in setup step:", address)
    handleWalletSelect(address)
  }

  const handleAddNewWallet = async () => {
    if (!newWalletAddress.trim() || !validateWalletAddress(newWalletAddress)) {
      return
    }

    setLoading(true)
    try {
      const result = await addWalletAction(user!.id, newWalletAddress)

      if (result.error) throw new Error(result.error)

      // Reload wallets and select the new one
      await loadUserWallets()
      handleWalletSelect(newWalletAddress.toLowerCase())
      setShowAddWallet(false)
      setNewWalletAddress("")
    } catch (error) {
      console.error("Error adding wallet:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold">Setup Payment Wallet</h3>
            <p className="text-sm text-muted-foreground">Loading wallet connection...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${isValidated ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
            }`}
        >
          {isValidated ? <CheckCircle className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-semibold">Setup Payment Wallet</h3>
          <p className="text-sm text-muted-foreground">Choose where you want to receive USDC payments</p>
        </div>
      </div>

      {required && !isValidated && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must specify a wallet address to receive payments for your campaign. Contributors will send USDC directly to this address.
          </AlertDescription>
        </Alert>
      )}

      {/* Existing Wallets */}
      {userWallets.length > 0 && (
        <div className="space-y-3">
          <Label>Select from your saved wallets:</Label>
          <Select value={selectedWallet} onValueChange={handleWalletSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a wallet address" />
            </SelectTrigger>
            <SelectContent>
              {userWallets.map((wallet) => (
                <SelectItem key={wallet.address} value={wallet.address}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                    {wallet.verified && (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    )}
                    <span className="text-xs text-gray-500">({wallet.type})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Add New Wallet Option */}
      {!showAddWallet ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddWallet(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Wallet Address
        </Button>
      ) : (
        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
          <Label htmlFor="new-wallet">New Wallet Address</Label>
          <Input
            id="new-wallet"
            placeholder="G..."
            value={newWalletAddress}
            onChange={(e) => setNewWalletAddress(e.target.value)}
            disabled={loading}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAddNewWallet}
              disabled={loading || !validateWalletAddress(newWalletAddress)}
              size="sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Wallet"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddWallet(false)
                setNewWalletAddress("")
              }}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Smart Wallet Connection */}
      <div className="relative">
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2">
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300" />
            {/* <span className="px-3 text-sm text-gray-500 bg-white">or connect your wallet</span> */}
            <div className="flex-1 border-t border-gray-300" />
          </div>
        </div>
        <div className="pt-8">
          <SmartWalletConnect onConnect={handleWalletConnect} />
        </div>
      </div>

      {isValidated && walletAddress && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Wallet Setup Complete</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your campaign will receive USDC payments at this address on Stellar
            </p>
            <p className="text-xs text-green-600 mt-2 font-mono bg-green-100 p-2 rounded">
              {walletAddress}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
