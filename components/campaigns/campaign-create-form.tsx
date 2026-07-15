"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WalletSetupStep } from "@/components/campaigns/wallet-setup-step"
import { createCampaignAction } from "@/app/actions/campaign-actions"
import { useOnchain } from "@/components/providers/onchain-provider"
import { useStellarWallet } from "@/components/providers/stellar-wallet-provider"
import { isSorobanEscrowConfigured } from "@/lib/stellar/config"
import { formatStellarAddressShort } from "@/lib/stellar/validation"
import {
  defaultCampaignDeadline,
  formatDeadlineInputValue,
} from "@/lib/stellar/campaign-deploy"
import {
  Loader2,
  Upload,
  DollarSign,
  Target,
  FileText,
  Tag,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

export function CampaignCreateForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [deployingEscrow, setDeployingEscrow] = useState(false)
  const [error, setError] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const { deployCampaignEscrow } = useOnchain()
  const { connectWallet, address: connectedAddress, isConnected, needsFunding } = useStellarWallet()
  const escrowEnabled = isSorobanEscrowConfigured()
  const defaultDeadline = formatDeadlineInputValue(defaultCampaignDeadline())

  const categories = [
    "Education",
    "Healthcare",
    "Technology",
    "Community",
    "Environment",
    "Arts & Culture",
    "Sports",
    "Business",
    "Emergency",
    "Other",
  ]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleWalletComplete = (address: string) => {
    console.log("Wallet completed with address:", address)
    setWalletAddress(address)
    setIsWalletConnected(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log("Form submission started")

    if (!walletAddress) {
      setError("Please connect your wallet to receive payments")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData(e.currentTarget)

      // Extract and validate form data
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const goalAmount = formData.get("goalAmount") as string
      const category = formData.get("category") as string
      const deadlineInput = formData.get("deadline") as string
      const imageFile = formData.get("image") as File

      console.log("Form data extracted:", { title, description, goalAmount, category, walletAddress, deadlineInput })

      // Validate required fields
      if (!title?.trim()) {
        throw new Error("Campaign title is required")
      }
      if (!description?.trim()) {
        throw new Error("Campaign description is required")
      }
      if (!goalAmount || isNaN(Number(goalAmount))) {
        throw new Error("Valid goal amount is required")
      }
      if (!category) {
        throw new Error("Campaign category is required")
      }
      if (!deadlineInput) {
        throw new Error("Campaign deadline is required")
      }
      const deadline = new Date(deadlineInput + "T23:59:59Z")
      if (isNaN(deadline.getTime()) || deadline <= new Date()) {
        throw new Error("Deadline must be a future date")
      }

      // Add wallet address to form data
      formData.append("walletAddress", walletAddress)

      console.log("Calling createCampaignAction with FormData")

      const result = await createCampaignAction(formData)
      console.log("Campaign creation result:", result)

      if (!result.success) {
        throw new Error(result.error || "Failed to create campaign")
      }

      if (result.campaignId) {
        if (escrowEnabled) {
          setDeployingEscrow(true)
          try {
            let signerAddress = connectedAddress
            if (!isConnected || !signerAddress) {
              signerAddress = await connectWallet()
            }
            if (walletAddress && signerAddress !== walletAddress) {
              throw new Error(
                `Connected wallet (${formatStellarAddressShort(signerAddress)}) must match your organizer wallet (${formatStellarAddressShort(walletAddress)}). Connect the correct account in Freighter.`,
              )
            }
            if (needsFunding) {
              throw new Error(
                "Fund your testnet wallet with XLM before deploying escrow (use Fund Testnet Account in wallet setup).",
              )
            }
            await deployCampaignEscrow(
              result.campaignId,
              Number(goalAmount),
              deadline,
            )
          } catch (deployErr: unknown) {
            const msg =
              deployErr instanceof Error ? deployErr.message : "Escrow deployment failed"
            console.error("Escrow deployment error:", deployErr)
            setError(
              `Campaign saved, but Soroban escrow deployment failed: ${msg}. Contributors can still donate via direct wallet payments.`,
            )
            setLoading(false)
            setDeployingEscrow(false)
            window.location.href = `/campaigns/${result.campaignId}`
            return
          }
          setDeployingEscrow(false)
        }

        console.log("Campaign created successfully, redirecting to:", `/campaigns/${result.campaignId}`)
        window.location.href = `/campaigns/${result.campaignId}`
      } else {
        throw new Error("Campaign was created but no ID was returned")
      }
    } catch (error: any) {
      console.error("Campaign creation error:", error)
      setError(error.message || "Failed to create campaign. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const canProceedToStep2 = walletAddress && isWalletConnected
  const canSubmit = canProceedToStep2

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
              }`}
          >
            {isWalletConnected ? <CheckCircle className="h-4 w-4" /> : "1"}
          </div>
          <span className="ml-2 font-medium">Wallet Setup</span>
        </div>
        <div className={`w-8 h-0.5 ${currentStep >= 2 ? "bg-primary" : "bg-muted-foreground"}`}></div>
        <div className={`flex items-center ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
              }`}
          >
            2
          </div>
          <span className="ml-2 font-medium">Campaign Details</span>
        </div>
      </div>

      {/* Step 1: Wallet Setup */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Step 1: Setup Payment Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WalletSetupStep
              onComplete={handleWalletComplete}
              required={true}
              requireSignerConnection={escrowEnabled}
            />

            <div className="flex justify-end mt-6">
              <Button onClick={() => setCurrentStep(2)} disabled={!canProceedToStep2} className="min-w-32">
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Campaign Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Step 2: Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campaign Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Campaign Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Give your campaign a compelling title"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a clear, descriptive title that explains what you're raising money for
                </p>
              </div>

              {/* Campaign Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Campaign Story *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Tell your story. Why is this campaign important? How will the funds be used?"
                  required
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  Share your story, explain your cause, and tell people how their contributions will make a difference
                </p>
              </div>

              {/* Goal Amount */}
              <div className="space-y-2">
                <Label htmlFor="goalAmount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Funding Goal (USDC) *
                </Label>
                <Input
                  id="goalAmount"
                  name="goalAmount"
                  type="number"
                  placeholder="1000"
                  required
                  min="100"
                  max="1000000"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  {escrowEnabled
                    ? "Goal is enforced on-chain in the Soroban escrow contract"
                    : "Set a realistic goal in USDC. Contributors can send payments directly to your wallet"}
                </p>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Campaign Deadline *</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                  required
                  defaultValue={defaultDeadline}
                  min={formatDeadlineInputValue(new Date(Date.now() + 86400000))}
                />
                <p className="text-xs text-muted-foreground">
                  {escrowEnabled
                    ? "Donors can request refunds after this date if the goal is not met"
                    : "When the campaign ends — shown to contributors on the campaign page"}
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category *
                </Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign Image */}
              <div className="space-y-2">
                <Label htmlFor="image" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Campaign Image (Optional)
                </Label>
                <div className="space-y-4">
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Campaign preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800">Campaign Creation Failed</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {error.includes("logged in") && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => (window.location.href = "/auth/login")}
                          className="bg-transparent"
                        >
                          Go to Login
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                  className="min-w-32"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading || !canSubmit} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {deployingEscrow ? "Deploying Soroban Escrow..." : "Creating Campaign..."}
                    </>
                  ) : (
                    escrowEnabled ? "Create Campaign & Deploy Escrow" : "Create Campaign"
                  )}
                </Button>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Payment Information:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {escrowEnabled ? (
                    <>
                      <li>• A Soroban escrow contract will be deployed for this campaign (requires wallet signature)</li>
                      <li>• Donations are held in escrow until the goal is met or the deadline passes</li>
                      <li>• Your connected wallet ({walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}) receives funds on successful withdrawal</li>
                    </>
                  ) : (
                    <>
                      <li>
                        • Contributors will send USDC directly to your wallet: {walletAddress?.slice(0, 6)}...
                        {walletAddress?.slice(-4)}
                      </li>
                      <li>• Deploy the campaign factory (see contracts/README.md) to enable Soroban escrow</li>
                    </>
                  )}
                  <li>• Mobile money and card donations are also available via Lipila</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
