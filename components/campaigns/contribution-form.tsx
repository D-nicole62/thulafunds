"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createContribution } from "@/app/actions/contribution-actions"
import { useToast } from "@/hooks/use-toast"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { isValidStellarAddress } from "@/lib/stellar/validation"
import { 
  X, 
  DollarSign, 
  MessageSquare, 
  User, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink
} from "lucide-react"
import type { ContributionFormProps } from "@/types/campaign"

export function ContributionForm({ campaign, currentUser, onCloseAction }: ContributionFormProps) {
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"form" | "wallet" | "payment" | "success">("form")
  const [transactionStatus, setTransactionStatus] = useState<"pending" | "completed">("completed")
  
  const { toast } = useToast()
  const { paymentStatus, deposit, networkInfo, isReady, error: onchainError, balance } = useOnchain()
  const { address, isConnected, connectWallet } = useStellarWallet()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleConnectWallet = async () => {
    try {
      setError("")
      if (!isConnected) {
        await connectWallet()
      }
      setStep("payment")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to connect wallet")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || isNaN(Number(amount)) || Number(amount) < 0.01) {
      setError("Please enter a valid amount (minimum $0.01)")
      return
    }

    if (Number(amount) > 10000) {
      setError("Contribution amount cannot exceed $10,000")
      return
    }

    // Check USDC balance
    if (balance && parseFloat(balance) < Number(amount)) {
      setError(`Insufficient USDC balance. You have ${parseFloat(balance).toFixed(2)} USDC, but need ${Number(amount).toFixed(2)} USDC.`)
      return
    }

    setError("")
    setStep("wallet")
  }

  const processPayment = async () => {
    if (!isReady || !address) {
      setError("Wallet not connected. Please connect your Freighter wallet.")
      return
    }

    if (!campaign.contract_address) {
      setError("This campaign has no Soroban escrow contract. Please contact the organizer.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const paymentResult = await deposit(amount, campaign.contract_address, campaign.id)

      if (paymentResult?.txHash) {
        const response = await fetch(`/api/campaigns/${campaign.id}/contribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: paymentResult.txHash,
            amount: Number(amount),
            message: message.trim() || undefined,
            anonymous,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to create contribution record")
        }

        setTransactionStatus("completed")
        toast({
          title: "Donation confirmed on Stellar!",
          description: `Your $${Number(amount).toFixed(2)} USDC is held in Soroban escrow. Tx: ${paymentResult.txHash.slice(0, 8)}...`,
        })

        setStep("success")
      } else {
        throw new Error("Payment was not completed successfully")
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to process payment. Please try again."
      let isUserRejection = false
      
      // Check for user rejection patterns (case-insensitive and comprehensive)
      const errorMessageLower = error.message.toLowerCase()
      if (errorMessageLower.includes("user rejected") ||
          errorMessageLower.includes("user denied") ||
          errorMessageLower.includes("user cancelled") ||
          errorMessageLower.includes("metamask tx signature: user denied") ||
          errorMessageLower.includes("user denied transaction signature") ||
          errorMessageLower.includes("user rejected the request") ||
          errorMessageLower.includes("transaction was rejected") ||
          errorMessageLower.includes("denied transaction signature")) {
        errorMessage = "Transaction was cancelled. You can try again when you're ready."
        isUserRejection = true
      } else if (error.message.includes("insufficient funds") ||
                 error.message.includes("Insufficient balance")) {
        errorMessage = "Insufficient USDC balance. Please check your wallet."
      } else if (error.message.includes("network") ||
                 error.message.includes("chain")) {
        errorMessage = "Please connect your Stellar wallet (Freighter, Albedo, or xBull)."
      } else if (error.message.includes("wallet") ||
                 error.message.includes("connection")) {
        errorMessage = "Wallet connection issue. Please reconnect your wallet."
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage = "Transaction failed. Please check your wallet settings and try again."
      } else if (error.message.includes("contract") ||
                 error.message.includes("execution")) {
        errorMessage = "Smart contract error. Please try again or contact support."
      } else if (error.message.includes("invalid recipient") ||
                 error.message.includes("invalid address")) {
        errorMessage = "Invalid recipient wallet address. Please contact the campaign creator."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Log detailed error for debugging
      console.error("Contribution form error details:", {
        message: error.message,
        isUserRejection,
        stack: error.stack
      })
      
      // Log what error message we're setting
      console.log("Setting error message:", {
        originalError: error.message,
        processedError: errorMessage,
        isUserRejection
      })
      
      setError(errorMessage)
      
      // If it's a user rejection, show a more helpful message
      if (isUserRejection) {
        toast({
          title: "Transaction Cancelled",
          description: "No worries! You can try again whenever you're ready.",
          variant: "default"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const remainingAmount = campaign.goal_amount - campaign.current_amount
  const progressPercentage = (campaign.current_amount / campaign.goal_amount) * 100

  // Handle payment status changes
  useEffect(() => {
    if (paymentStatus === "completed" && step === "payment") {
      setStep("success")
    } else if (paymentStatus === "failed") {
      // Only set error from onchain if we don't already have a local error
      if (!error) {
        setError(onchainError || "Payment failed")
      }
    }
  }, [paymentStatus, onchainError, step, error])

  if (step === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">
            {transactionStatus === "pending" ? "Transaction Submitted!" : "Contribution Submitted!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {transactionStatus === "pending" 
              ? `Your contribution of $${Number(amount).toFixed(2)} has been submitted and is being processed on the blockchain. You can check your wallet for the transaction status.`
              : `Your contribution of $${Number(amount).toFixed(2)} has been submitted successfully.`
            }
          </p>
          {transactionStatus === "pending" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The transaction is being processed. This usually takes a few minutes. You can check your wallet or a blockchain explorer for updates.
              </p>
            </div>
          )}
          <Button onClick={onCloseAction} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "wallet") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Connect Wallet</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError("")
              setStep("form")
            }}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Stellar wallet to donate USDC into on-chain Soroban escrow.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full" size="lg">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Freighter Wallet
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Wallet Connected</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
                {balance && (
                  <div className="text-sm text-green-700 mt-1">
                    Balance: {parseFloat(balance).toFixed(2)} USDC
                  </div>
                )}
              </div>
              <Button onClick={() => setStep("payment")} className="w-full" size="lg">
                Continue to Payment
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            <p>Donation held in Soroban escrow until goal met or deadline</p>
            <p>No platform fees • Instant transfers</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "payment") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Confirm Payment</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError("")
              setStep("wallet")
            }}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Contribution Amount:</span>
              <span className="font-semibold">${Number(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-sm text-muted-foreground">{networkInfo.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Currency:</span>
              <span className="text-sm text-muted-foreground">USDC</span>
            </div>
            {balance && (
              <div className="flex justify-between">
                <span>Your Balance:</span>
                <span className="text-sm text-muted-foreground">{parseFloat(balance).toFixed(2)} USDC</span>
              </div>
            )}
            {message && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Message:</div>
                <div className="text-sm">"{message}"</div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
              <div className="mt-3 space-y-2">
                {(error.toLowerCase().includes("cancelled") || 
                  error.toLowerCase().includes("user rejected") ||
                  error.toLowerCase().includes("user denied")) ? (
                  <div className="text-sm text-destructive/80">
                    <p>• Check your wallet popup and approve the transaction</p>
                    <p>• Make sure you have enough USDC balance</p>
                    <p>• Ensure your Freighter wallet is connected</p>
                  </div>
                ) : null}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError("")
                    processPayment()
                  }}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Try Again
                </Button>
              </div>
            </Alert>
          )}

          <Button 
            onClick={processPayment} 
            disabled={loading || paymentStatus === "pending"}
            className="w-full"
            size="lg"
          >
            {loading || paymentStatus === "pending" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Pay ${Number(amount).toFixed(2)}
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              <p className="font-medium mb-1">Before you pay:</p>
              <p>• Check your wallet popup when it appears</p>
              <p>• Review the transaction details carefully</p>
              <p>• Make sure you have enough USDC balance</p>
            </div>
            <p>Funds secured by Stellar Soroban smart contract</p>
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Make a Contribution</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCloseAction}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="font-medium text-sm text-muted-foreground mb-2">
            Campaign Progress
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Raised</span>
              <span className="font-medium">{formatCurrency(campaign.current_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Goal</span>
              <span className="font-medium">{formatCurrency(campaign.goal_amount)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            {remainingAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(remainingAmount)} still needed
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contribution Amount
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (error) setError("") // Clear error when user starts typing
              }}
              min="0.01"
              max="10000"
              step="0.01"
              required
              className={`text-lg font-medium ${error && (!amount || Number(amount) < 0.01 || Number(amount) > 10000) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              Minimum $0.01, Maximum $10,000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Leave a message of support..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={anonymous}
              onCheckedChange={(checked: boolean | "indeterminate") => setAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous" className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Make this contribution anonymous
            </Label>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseAction}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !amount || Number(amount) < 0.01 || Number(amount) > 10000}
            >
              Continue to Payment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 