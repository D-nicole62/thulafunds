"use client"

import { useState } from "react"
import { CampaignHeader } from "./campaign-header"
import { CampaignProgress } from "./campaign-progress"
import { CampaignCreator } from "./campaign-creator"
import { CampaignPaymentInfo } from "./campaign-payment-info"
import { SorobanActions } from "./soroban-actions"
import { ContributionForm } from "./contribution-form"
import { RecentContributions } from "./recent-contributions"
import { CampaignUpdates } from "./campaign-updates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CampaignDetailViewProps } from "@/types/campaign"

export function CampaignDetailView({ 
  campaign, 
  contributions, 
  updates, 
  currentUser 
}: CampaignDetailViewProps) {
  const [showContributionForm, setShowContributionForm] = useState(false)

  // Ensure we have the creator profile data
  const creatorProfile = campaign.profiles

  if (!creatorProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Campaign creator information not available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-0">
                <CampaignHeader campaign={campaign} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Campaign Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignUpdates updates={updates} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentContributions contributions={contributions} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-8 h-fit">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Campaign Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignProgress 
                  campaign={{
                    id: campaign.id,
                    current_amount: campaign.current_amount,
                    goal_amount: campaign.goal_amount,
                    contract_address: campaign.contract_address,
                    deadline: campaign.deadline,
                    donations: campaign.donations || campaign.contributions || [],
                    created_at: campaign.created_at,
                  }}
                  onContributeAction={() => setShowContributionForm(true)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Campaign Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignCreator creator={creatorProfile} />
              </CardContent>
            </Card>

            <CampaignPaymentInfo walletAddress={campaign.contract_address || campaign.wallet_address} />

            {campaign.contract_address && (
              <SorobanActions
                contractAddress={campaign.contract_address}
                isOrganizer={currentUser?.id === campaign.creator_id}
              />
            )}
          </div>
        </div>
      </div>

      {/* Contribution Modal */}
      {showContributionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ContributionForm
            campaign={campaign}
            currentUser={currentUser}
            onCloseAction={() => setShowContributionForm(false)}
          />
        </div>
      )}
    </div>
  )
} 