import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  campaignProgressPercent,
  formatDonationAmount,
  isCampaignGoalReached,
} from "@/lib/format-donation"

interface Campaign {
  id: string
  title: string
  description: string
  goal_amount: number
  current_amount: number
  image_url?: string
  category: string
  created_at: string
  payment_method?: string | null
  profiles: {
    full_name: string
    avatar_url?: string
  }
}

interface CampaignGridProps {
  campaigns: Campaign[]
}

export function CampaignGrid({ campaigns }: CampaignGridProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="font-semibold mb-2">No campaigns found</h3>
        <p className="text-muted-foreground mb-4">Be the first to create a campaign and start making a difference!</p>
        <Link href="/campaigns/create">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
            Create Campaign
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((campaign) => {
        const isLipila = campaign.payment_method === "lipila"
        const currency = isLipila ? "ZMW" : "USD"
        const progress = campaignProgressPercent(campaign.current_amount, campaign.goal_amount)
        const isCompleted = isCampaignGoalReached(campaign.current_amount, campaign.goal_amount)
        const formatAmount = (amount: number) => formatDonationAmount(amount, currency)

        return (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="aspect-video overflow-hidden rounded-t-lg">
                {campaign.image_url ? (
                  <img
                    src={campaign.image_url || "/placeholder.svg"}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary">{campaign.title.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="text-xs">
                    {campaign.category}
                  </Badge>
                  {isCompleted && <Badge className="bg-green-100 text-green-800 text-xs">Goal reached</Badge>}
                </div>

                <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {campaign.title}
                </h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{campaign.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{formatAmount(campaign.current_amount)}</span>
                    <span className="text-muted-foreground">of {formatAmount(campaign.goal_amount)}</span>
                  </div>

                  <Progress value={progress} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {isCompleted ? "Goal reached!" : `${progress.toFixed(0)}% funded`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={campaign.profiles.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {campaign.profiles.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">by {campaign.profiles.full_name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
