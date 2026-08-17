"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { formatDonationAmount } from "@/lib/format-donation"
import type { RecentContributionsProps } from "@/types/campaign"

export function RecentContributions({ contributions }: RecentContributionsProps) {
  const sortedContributions = [...contributions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const getDisplayName = (contribution: (typeof contributions)[number]) => {
    if (contribution.anonymous) return "Anonymous"
    return contribution.profiles?.full_name || "Supporter"
  }

  const getDisplayInitials = (contribution: (typeof contributions)[number]) => {
    if (contribution.anonymous) return "A"
    return contribution.profiles?.full_name ? getInitials(contribution.profiles.full_name) : "U"
  }

  if (sortedContributions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Be the first to contribute to this campaign!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedContributions.map((contribution) => (
        <div key={contribution.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <Avatar className="w-10 h-10">
            <AvatarImage src={contribution.profiles?.avatar_url} alt={getDisplayName(contribution)} />
            <AvatarFallback>{getDisplayInitials(contribution)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{getDisplayName(contribution)}</div>
            {contribution.message && (
              <div className="text-sm text-muted-foreground line-clamp-1">"{contribution.message}"</div>
            )}
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(contribution.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="font-semibold text-primary flex-shrink-0">
            {formatDonationAmount(contribution.amount, contribution.currency)}
          </div>
        </div>
      ))}
    </div>
  )
}
