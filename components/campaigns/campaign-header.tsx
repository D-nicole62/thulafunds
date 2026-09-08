"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Share2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { isCampaignGoalReached } from "@/lib/format-donation"
import type { CampaignHeaderProps } from "@/types/campaign"

export function CampaignHeader({ campaign }: CampaignHeaderProps) {
  const { toast } = useToast()

  const shareCampaign = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.title,
          text: campaign.description,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied!",
          description: "Campaign link has been copied to your clipboard.",
        })
      }
    } catch (error) {
      console.error("Share error:", error)
      toast({
        title: "Share failed",
        description: "Unable to share the campaign. Please try again.",
        variant: "destructive",
      })
    }
  }

  const creatorName = campaign.profiles?.full_name || "Unknown Creator"
  const goalReached = isCampaignGoalReached(campaign.current_amount, campaign.goal_amount)

  return (
    <>
      <div className="aspect-video overflow-hidden rounded-lg">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-6xl font-bold text-primary">
              {campaign.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>By {creatorName}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(campaign.created_at))} ago</span>
              <span>•</span>
              <Badge variant="secondary">{campaign.category}</Badge>
              {goalReached && (
                <>
                  <span>•</span>
                  <Badge className="bg-green-100 text-green-800">Goal reached</Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shareCampaign}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="text-lg leading-relaxed">{campaign.description}</p>
        </div>
      </div>
    </>
  )
} 