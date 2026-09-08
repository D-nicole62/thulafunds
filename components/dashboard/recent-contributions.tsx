import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { asNumber } from "@/lib/db/helpers"
import { formatDonationAmount, isCompletedDonation } from "@/lib/format-donation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DatabaseErrorCard } from "@/components/dashboard/database-error-card"

interface RecentContributionsProps {
  userId: string
}

export async function RecentContributions({ userId }: RecentContributionsProps) {
  try {
    const db = createAdminClient()

    const { data: userCampaigns } = await db.from("campaigns").select("id").eq("creator_id", userId)
    const userCampaignIds = (userCampaigns ?? []).map((c) => c.id)

    if (userCampaignIds.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Support Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a campaign to start receiving support from donors.
              </p>
              <Link href="/campaigns/create">
                <Button size="sm">Create Campaign</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )
    }

    const { data: receivedRaw } = await db
      .from("donations")
      .select("*")
      .in("campaign_id", userCampaignIds)
      .order("created_at", { ascending: false })
      .limit(5)

    const allCampaignIds = [...new Set((receivedRaw ?? []).map((d) => d.campaign_id))]
    const allProfileIds = [
      ...new Set(
        (receivedRaw ?? [])
          .map((d) => d.contributor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    const [{ data: campaigns }, { data: profiles }] = await Promise.all([
      allCampaignIds.length > 0
        ? db.from("campaigns").select("id, title, image_url, creator_id").in("id", allCampaignIds)
        : Promise.resolve({ data: [] }),
      allProfileIds.length > 0
        ? db.from("profiles").select("id, full_name, avatar_url").in("id", allProfileIds)
        : Promise.resolve({ data: [] }),
    ])

    const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]))
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const receivedContributions = (receivedRaw ?? [])
      .filter((d) => isCompletedDonation(d.status))
      .map((d) => ({
        ...d,
        amount: asNumber(d.amount),
        contributor: profileMap.get(d.contributor_id ?? "") ?? null,
        campaign: campaignMap.get(d.campaign_id) ?? null,
      }))

    const totalReceived = receivedContributions.reduce((sum, contrib) => sum + asNumber(contrib.amount), 0)
    const receivedCurrency = receivedContributions[0]?.currency ?? "ZMW"

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Support Received
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {receivedContributions.length > 0 && (
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {formatDonationAmount(totalReceived, receivedCurrency)}
                </div>
                <div className="text-sm text-green-700">Total received on your campaigns</div>
              </div>
            )}

            {receivedContributions.length > 0 ? (
              <div className="space-y-3">
                {receivedContributions.slice(0, 3).map((contribution) => (
                  <div
                    key={contribution.id}
                    className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={contribution.contributor?.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {contribution.anonymous
                          ? "?"
                          : contribution.contributor?.full_name?.charAt(0).toUpperCase() ||
                            contribution.donor_name?.charAt(0).toUpperCase() ||
                            "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {contribution.anonymous
                              ? "Anonymous supporter"
                              : contribution.contributor?.full_name ||
                                contribution.donor_name ||
                                "Supporter"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contribution.campaign?.title ?? "Your campaign"}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-semibold text-sm text-green-600">
                            {formatDonationAmount(contribution.amount, contribution.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(contribution.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      {contribution.message && !contribution.anonymous && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{contribution.message}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No donations yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your campaign to start receiving support.
                </p>
                <Link href="/dashboard/campaigns">
                  <Button variant="outline" size="sm">
                    View My Campaigns
                  </Button>
                </Link>
              </div>
            )}

            {receivedContributions.length > 0 && (
              <div className="flex gap-2 pt-4 border-t">
                <Link href="/dashboard/contributions" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View All Support
                  </Button>
                </Link>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Browse More
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error("RecentContributions error:", error)
    return <DatabaseErrorCard title="Unable to load activity" error={error} />
  }
}
