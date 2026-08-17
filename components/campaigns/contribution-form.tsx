"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { isValidStellarAddress, formatStellarAddressShort } from "@/lib/stellar/validation"
import { 
  X, 
  DollarSign, 
  MessageSquare, 
  User, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Smartphone,
  CreditCard,
  Coins
} from "lucide-react"
import type { ContributionFormProps } from "@/types/campaign"

const LIPILA_CURRENCY = process.env.NEXT_PUBLIC_LIPILA_CURRENCY || "ZMW"
type PayMethod = "lipila" | "card" | "stellar"

/** Shared modal card: capped height + internal scroll on small screens */
const MODAL_CARD_CLASS =
  "w-full max-w-md max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto overscroll-contain"

/** Main donation step: scrollable body + sticky action buttons */
const MODAL_CARD_FLEX =
  "w-full max-w-md max-h-[min(90dvh,calc(100vh-2rem))] flex flex-col overflow-hidden overscroll-contain"

export function ContributionForm({ campaign, currentUser, onCloseAction }: ContributionFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"form" | "wallet" | "payment" | "lipila" | "card" | "success">("form")
  const [transactionStatus, setTransactionStatus] = useState<"pending" | "completed">("completed")
  const [payMethod, setPayMethod] = useState<PayMethod>("lipila")
  const [phone, setPhone] = useState("")
  const [guestName, setGuestName] = useState("")
  const [lipilaStage, setLipilaStage] = useState<"idle" | "prompting" | "waiting">("idle")

  const completeDonation = () => {
    setTransactionStatus("completed")
    router.refresh()
    setStep("success")
  }
  const [card, setCard] = useState({
    firstName: "",
    lastName: "",
    email: "",
    city: "",
    address: "",
    zip: "",
    country: "ZM",
  })
  
  const { toast } = useToast()
  const { paymentStatus, deposit, sendDirectPayment, networkInfo, isReady, error: onchainError, balance } = useOnchain()
  const { address, isConnected, connectWallet } = useStellarWallet()

  const hasEscrow = Boolean(campaign.contract_address)
  const hasCryptoWallet = Boolean(campaign.wallet_address)
  const canPayCrypto = hasEscrow || hasCryptoWallet

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
      setError("Please enter a valid amount (minimum 0.01)")
      return
    }

    if (Number(amount) > 10000) {
      setError("Contribution amount cannot exceed 10,000")
      return
    }

    if (payMethod === "lipila") {
      const digits = phone.replace(/\D/g, "")
      if (digits.length < 9) {
        setError("Please enter a valid mobile money number (e.g. 0976000000)")
        return
      }
      setError("")
      setStep("lipila")
      return
    }

    if (payMethod === "card") {
      const digits = phone.replace(/\D/g, "")
      if (!card.firstName.trim() || !card.lastName.trim()) {
        setError("Please enter your first and last name.")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email.trim())) {
        setError("Please enter a valid email address.")
        return
      }
      if (digits.length < 9) {
        setError("Please enter a valid phone number.")
        return
      }
      if (!card.city.trim() || !card.address.trim() || !card.zip.trim()) {
        setError("Please complete your billing address (city, address, zip).")
        return
      }
      setError("")
      setStep("card")
      return
    }

    if (payMethod === "stellar") {
      if (!canPayCrypto) {
        setError("Crypto donations are not available for this campaign. Use Mobile Money or Card.")
        return
      }
      if (balance && parseFloat(balance) < Number(amount)) {
        setError(`Insufficient USDC balance. You have ${parseFloat(balance).toFixed(2)} USDC, but need ${Number(amount).toFixed(2)} USDC.`)
        return
      }
      setError("")
      setStep("wallet")
    }
  }

  const formatMsisdn = (input: string) => {
    const digits = input.replace(/\D/g, "")
    if (digits.startsWith("260")) return digits
    if (digits.startsWith("0")) return `260${digits.slice(1)}`
    if (digits.length === 9) return `260${digits}`
    return digits
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  /** Poll Lipila collection status until success/failure or timeout. */
  const waitForConfirmation = async (referenceId: string, maxAttempts: number) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(5000)
      const statusRes = await fetch(
        `/api/lipila/status?referenceId=${encodeURIComponent(referenceId)}`,
      )
      const statusData = await statusRes.json().catch(() => ({}))
      const status = String(statusData?.status || "").toLowerCase()

      if (["successful", "success", "completed"].includes(status)) return true
      if (["failed", "failure", "cancelled", "canceled", "rejected", "error"].includes(status)) {
        throw new Error(statusData?.message || "The payment was declined or cancelled.")
      }
    }
    return false
  }

  const recordLipilaDonation = async (referenceId: string, donorName?: string) => {
    const recordRes = await fetch(`/api/campaigns/${campaign.id}/contribute-lipila`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId,
        message: message.trim() || undefined,
        anonymous,
        donorName: donorName?.trim() || undefined,
      }),
    })
    if (!recordRes.ok) {
      const errorData = await recordRes.json().catch(() => ({}))
      throw new Error(errorData.error || "Payment succeeded but recording the donation failed.")
    }
  }

  const newReferenceId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `lpl-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const processCardPayment = async () => {
    setLoading(true)
    setError("")
    setLipilaStage("prompting")

    const referenceId = newReferenceId()
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const returnUrl = `${origin}/campaigns/${campaign.id}`

    try {
      const collectRes = await fetch("/api/lipila/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "card",
          data: {
            collectionRequest: {
              referenceId,
              amount: Number(amount),
              narration: `Donation to ${campaign.title}`.slice(0, 100),
              currency: LIPILA_CURRENCY,
              backUrl: returnUrl,
              redirectUrl: returnUrl,
            },
            customerInfo: {
              firstName: card.firstName.trim(),
              lastName: card.lastName.trim(),
              email: card.email.trim(),
              phoneNumber: formatMsisdn(phone),
              country: card.country.trim() || "ZM",
              city: card.city.trim(),
              address: card.address.trim(),
              zip: card.zip.trim(),
            },
          },
        }),
      })

      const collectData = await collectRes.json().catch(() => ({}))
      if (!collectRes.ok) {
        throw new Error(collectData.error || "Failed to start the card payment.")
      }

      const redirectUrl =
        collectData.cardRedirectionUrl ||
        collectData.data?.cardRedirectionUrl ||
        collectData.redirectUrl

      if (!redirectUrl) {
        throw new Error("The gateway did not return a card payment page. Please try again.")
      }

      // Open Lipila's secure card page in a new tab; keep polling here.
      if (typeof window !== "undefined") {
        window.open(redirectUrl, "_blank", "noopener,noreferrer")
      }

      setLipilaStage("waiting")
      toast({
        title: "Complete your card payment",
        description: "A secure payment page opened in a new tab. Enter your card details there.",
      })

      const confirmed = await waitForConfirmation(referenceId, 60) // ~5 min
      if (!confirmed) {
        throw new Error(
          "We didn't receive confirmation in time. If you completed the card payment, your donation will appear shortly.",
        )
      }

      await recordLipilaDonation(
        referenceId,
        `${card.firstName.trim()} ${card.lastName.trim()}`.trim(),
      )

      toast({
        title: "Donation received!",
        description: `Thank you for your ${LIPILA_CURRENCY} ${Number(amount).toFixed(2)} card contribution.`,
      })
      completeDonation()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Card payment failed. Please try again.")
    } finally {
      setLoading(false)
      setLipilaStage("idle")
    }
  }

  const processLipilaPayment = async () => {
    setLoading(true)
    setError("")
    setLipilaStage("prompting")

    const referenceId = newReferenceId()

    try {
      const collectRes = await fetch("/api/lipila/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "momo",
          data: {
            referenceId,
            amount: Number(amount),
            narration: `Donation to ${campaign.title}`.slice(0, 100),
            accountNumber: formatMsisdn(phone),
            currency: LIPILA_CURRENCY,
          },
        }),
      })

      const collectData = await collectRes.json().catch(() => ({}))
      if (!collectRes.ok) {
        throw new Error(collectData.error || "Failed to start the mobile money payment.")
      }

      // Lipila collection is asynchronous: the payer approves a prompt on their
      // phone. Poll the status until it succeeds, fails, or we time out.
      setLipilaStage("waiting")
      toast({
        title: "Check your phone",
        description: `Approve the ${LIPILA_CURRENCY} ${Number(amount).toFixed(2)} payment prompt to complete your donation.`,
      })

      const confirmed = await waitForConfirmation(referenceId, 30) // ~2.5 min
      if (!confirmed) {
        throw new Error(
          "We didn't receive confirmation in time. If you approved the prompt, your donation will appear shortly.",
        )
      }

      await recordLipilaDonation(
        referenceId,
        currentUser?.full_name || guestName.trim() || undefined,
      )

      toast({
        title: "Donation received!",
        description: `Thank you for your ${LIPILA_CURRENCY} ${Number(amount).toFixed(2)} contribution.`,
      })
      completeDonation()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile money payment failed. Please try again.")
    } finally {
      setLoading(false)
      setLipilaStage("idle")
    }
  }

  const processPayment = async () => {
    if (!isReady || !address) {
      setError("Wallet not connected. Please connect your Freighter wallet.")
      return
    }

    if (!canPayCrypto) {
      setError("This campaign cannot accept crypto donations yet. Use Mobile Money or Card instead.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const paymentResult = hasEscrow
        ? await deposit(amount, campaign.contract_address!, campaign.id)
        : await sendDirectPayment(amount, campaign.wallet_address!, campaign.id)

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

        toast({
          title: "Donation confirmed on Stellar!",
          description: hasEscrow
            ? `Your $${Number(amount).toFixed(2)} USDC is held in Soroban escrow. Tx: ${paymentResult.txHash.slice(0, 8)}...`
            : `Your $${Number(amount).toFixed(2)} USDC was sent to the organizer. Tx: ${paymentResult.txHash.slice(0, 8)}...`,
        })

        completeDonation()
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
      router.refresh()
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
      <Card className={MODAL_CARD_CLASS}>
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

  if (step === "lipila") {
    return (
      <Card className={MODAL_CARD_CLASS}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Confirm Mobile Money Payment</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (loading) return
              setError("")
              setStep("form")
            }}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold">{LIPILA_CURRENCY} {Number(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pay from:</span>
              <span className="text-sm text-muted-foreground">{formatMsisdn(phone)}</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="text-sm text-muted-foreground">Lipila Mobile Money</span>
            </div>
            {message && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Message:</div>
                <div className="text-sm">"{message}"</div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError("")
                    processLipilaPayment()
                  }}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Try Again
                </Button>
              </div>
            </Alert>
          )}

          <Button onClick={processLipilaPayment} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {lipilaStage === "waiting" ? "Waiting for approval..." : "Sending prompt..."}
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Pay {LIPILA_CURRENCY} {Number(amount).toFixed(2)}
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <p>• Tap pay, then approve the prompt on your phone</p>
              <p>• Enter your mobile money PIN to confirm</p>
              <p>• Keep this window open until it completes</p>
            </div>
            <p>Payments processed securely by Lipila</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "card") {
    return (
      <Card className={MODAL_CARD_CLASS}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Confirm Card Payment</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (loading) return
              setError("")
              setStep("form")
            }}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold">{LIPILA_CURRENCY} {Number(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cardholder:</span>
              <span className="text-sm text-muted-foreground">{card.firstName} {card.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="text-sm text-muted-foreground">Visa / Mastercard</span>
            </div>
            {message && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Message:</div>
                <div className="text-sm">"{message}"</div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError("")
                    processCardPayment()
                  }}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Try Again
                </Button>
              </div>
            </Alert>
          )}

          <Button onClick={processCardPayment} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {lipilaStage === "waiting" ? "Waiting for payment..." : "Opening secure page..."}
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {LIPILA_CURRENCY} {Number(amount).toFixed(2)} by Card
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <p>• A secure Lipila page opens in a new tab</p>
              <p>• Enter your Visa/Mastercard details there</p>
              <p>• Return here — we'll confirm automatically</p>
            </div>
            <p>Card payments processed securely by Lipila</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "wallet") {
    return (
      <Card className={MODAL_CARD_CLASS}>
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
                  {formatStellarAddressShort(address)}
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
      <Card className={MODAL_CARD_CLASS}>
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
              <span>Destination:</span>
              <span className="text-sm text-muted-foreground">
                {hasEscrow ? "Soroban escrow" : "Organizer wallet"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Currency:</span>
              <span className="text-sm text-muted-foreground">USDC</span>
            </div>
            {!hasEscrow && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                This campaign has no on-chain escrow yet. Your USDC goes directly to the organizer&apos;s wallet.
              </p>
            )}
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
    <Card className={MODAL_CARD_FLEX}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pb-4">
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
      <CardContent className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="mb-4">
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

        {!currentUser && (payMethod === "lipila" || payMethod === "card") && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
            Donating as a guest is fine — no account needed.{" "}
            <Link
              href={`/auth/login?next=${encodeURIComponent(`/campaigns/${campaign.id}`)}`}
              className="font-medium underline underline-offset-2"
            >
              Sign in
            </Link>{" "}
            if you want this gift on your dashboard.
          </div>
        )}

        <form id="contribution-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPayMethod("lipila")
                  if (error) setError("")
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-sm transition-colors ${
                  payMethod === "lipila"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">Mobile Money</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayMethod("card")
                  if (error) setError("")
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-sm transition-colors ${
                  payMethod === "card"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canPayCrypto) return
                  setPayMethod("stellar")
                  if (error) setError("")
                }}
                disabled={!canPayCrypto}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-sm transition-colors ${
                  payMethod === "stellar"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:bg-muted"
                } ${!canPayCrypto ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Coins className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">Crypto</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {payMethod === "lipila" && `Mobile money via Lipila (${LIPILA_CURRENCY})`}
              {payMethod === "card" && `Visa / Mastercard via Lipila (${LIPILA_CURRENCY})`}
              {payMethod === "stellar" && hasEscrow && "USDC held in Soroban escrow on Stellar"}
              {payMethod === "stellar" && !hasEscrow && canPayCrypto && "USDC sent directly to the organizer's Stellar wallet"}
              {payMethod === "stellar" && !canPayCrypto && "Crypto unavailable for this campaign"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              {payMethod === "lipila" ? <Smartphone className="h-4 w-4" /> : payMethod === "card" ? <CreditCard className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
              Contribution Amount {payMethod === "stellar" ? "(USDC)" : `(${LIPILA_CURRENCY})`}
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
              Minimum 0.01, Maximum 10,000
            </p>
          </div>

          {payMethod === "lipila" && (
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money Number
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0976 000 000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (error) setError("")
                }}
                className={`${error && phone.replace(/\D/g, "").length < 9 ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                You'll get a prompt on this number to approve the payment.
              </p>
              {!currentUser && (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="guestName" className="text-xs flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Your name (optional)
                  </Label>
                  <Input
                    id="guestName"
                    placeholder="How you'd like to appear on the campaign"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {payMethod === "card" && (
            <div className="space-y-3 rounded-lg border border-input p-3">
              <p className="text-xs font-medium text-muted-foreground">Billing details</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-xs">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={card.firstName}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, firstName: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-xs">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={card.lastName}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, lastName: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardEmail" className="text-xs">Email</Label>
                <Input
                  id="cardEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={card.email}
                  onChange={(e) => {
                    setCard((c) => ({ ...c, email: e.target.value }))
                    if (error) setError("")
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardPhone" className="text-xs">Phone</Label>
                <Input
                  id="cardPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 0976 000 000"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (error) setError("")
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    placeholder="Lusaka"
                    value={card.city}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, city: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zip" className="text-xs">Zip / Postal</Label>
                  <Input
                    id="zip"
                    placeholder="10101"
                    value={card.zip}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, zip: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-xs">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={card.address}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, address: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="country" className="text-xs">Country</Label>
                  <Input
                    id="country"
                    placeholder="ZM"
                    value={card.country}
                    onChange={(e) => {
                      setCard((c) => ({ ...c, country: e.target.value }))
                      if (error) setError("")
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Card details are entered on Lipila's secure page, not here.
              </p>
            </div>
          )}

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
        </form>
      </CardContent>
      <div className="shrink-0 border-t bg-card p-4 flex gap-3">
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
          form="contribution-form"
          className="flex-1"
          disabled={loading || !amount || Number(amount) < 0.01 || Number(amount) > 10000}
        >
          Continue to Payment
        </Button>
      </div>
    </Card>
  )
} 