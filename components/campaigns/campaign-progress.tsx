"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Heart, Loader2, Link2 } from "lucide-react"
import { useCampaignBalance } from "@/hooks/use-campaign-balance"
import type { CampaignProgressProps } from "@/types/campaign"

export function CampaignProgress({ campaign, onContributeAction }: CampaignProgressProps) {
  const {
    balance: raised,
    goal,
    loading,
    source,
  } = useCampaignBalance(
    campaign.id,
    campaign.contract_address,
    campaign.current_amount,
    campaign.goal_amount,
  )

  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const isCompleted = progress >= 100

  const deadline = campaign.deadline
    ? new Date(campaign.deadline)
    : new Date(new Date(campaign.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)

  const donationsCount = campaign.donations?.length || campaign.contributions?.length || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            Campaign Progress
          </span>
          {source === "soroban" && (
            <Badge variant="outline" className="text-xs">
              <Link2 className="w-3 h-3 mr-1" />
              Live on-chain
            </Badge>
          )}
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
              <span>Raised (Soroban escrow)</span>
              <span className="font-semibold">{formatCurrency(raised)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Goal</span>
              <span>{formatCurrency(goal)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-center text-sm text-muted-foreground">
              {progress.toFixed(1)}% of goal reached
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{donationsCount}</div>
            <div className="text-xs text-muted-foreground">Donors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{daysLeft}</div>
            <div className="text-xs text-muted-foreground">Days Left</div>
          </div>
        </div>

        {!isCompleted ? (
          <Button onClick={onContributeAction} className="w-full" size="lg">
            <Heart className="w-4 h-4 mr-2" />
            Donate via Soroban
          </Button>
        ) : (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold text-green-800">Goal Reached!</div>
            <div className="text-sm text-green-700">
              Organizer can withdraw from on-chain escrow
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
