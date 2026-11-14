"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Heart, Loader2, Link2 } from "lucide-react"
import { useCampaignBalance } from "@/hooks/use-campaign-balance"
import {
  campaignProgressPercent,
  DISPLAY_CURRENCY,
  formatCampaignAmount,
  formatDonationAmount,
  isCampaignGoalReached,
} from "@/lib/format-donation"
import { campaignAcceptsLipilaDonations } from "@/lib/lipila/campaign-lipila"
import type { CampaignProgressProps } from "@/types/campaign"

export function CampaignProgress({
  campaign,
  onContributeAction,
  showDonorDetails = false,
}: CampaignProgressProps) {
  const hasEscrow = Boolean(campaign.contract_address)
  const isLipilaPrimary = campaignAcceptsLipilaDonations(campaign)
  const donationsTotal = (campaign.donations ?? campaign.contributions ?? []).reduce(
    (sum, d) => sum + Number(d.amount ?? 0),
    0,
  )
  const fallbackRaised = isLipilaPrimary
    ? Math.max(campaign.current_amount, donationsTotal)
    : campaign.current_amount
  const currency =
    campaign.donations?.[0]?.currency ??
    campaign.contributions?.[0]?.currency ??
    DISPLAY_CURRENCY

  const {
    balance: raised,
    goal,
    loading,
    source,
  } = useCampaignBalance(
    campaign.id,
    campaign.contract_address,
    fallbackRaised,
    campaign.goal_amount,
  )

  const progress = campaignProgressPercent(raised, goal)
  const isCompleted = isCampaignGoalReached(raised, goal)

  const deadline = campaign.deadline
    ? new Date(campaign.deadline)
    : new Date(new Date(campaign.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const donationsCount = campaign.donations?.length || campaign.contributions?.length || 0
  const raisedLabel = hasEscrow
    ? "Raised (Soroban escrow)"
    : isLipilaPrimary
      ? "Raised (Lipila)"
      : "Raised"
  const formatAmount = (amount: number) => formatDonationAmount(amount, currency)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            Campaign Progress
          </span>
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-800 text-xs">Goal reached</Badge>
          ) : source === "soroban" ? (
            <Badge variant="outline" className="text-xs">
              <Link2 className="w-3 h-3 mr-1" />
              Live on-chain
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{raisedLabel}</span>
              <span className="font-semibold">{formatAmount(raised)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Goal</span>
              <span>{formatAmount(goal)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-center text-sm text-muted-foreground">
              {isCompleted ? "Goal reached!" : `${progress.toFixed(1)}% of goal reached`}
            </div>
          </div>
        )}

        <div className={`grid gap-4 text-center ${showDonorDetails ? "grid-cols-2" : "grid-cols-1"}`}>
          {showDonorDetails && (
            <div>
              <div className="text-2xl font-bold text-primary">{donationsCount}</div>
              <div className="text-xs text-muted-foreground">Donors</div>
            </div>
          )}
          <div>
            <div className="text-2xl font-bold text-primary">{daysLeft}</div>
            <div className="text-xs text-muted-foreground">Days Left</div>
          </div>
        </div>

        {!isCompleted ? (
          <Button onClick={onContributeAction} className="w-full" size="lg">
            <Heart className="w-4 h-4 mr-2" />
            {isLipilaPrimary ? "Donate with Mobile Money" : hasEscrow ? "Donate via Soroban" : "Donate"}
          </Button>
        ) : (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold text-green-800">Goal Reached!</div>
            <div className="text-sm text-green-700">
              {hasEscrow
                ? "Organizer can withdraw from on-chain escrow"
                : "This campaign has reached its fundraising goal. Thank you to all supporters."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
