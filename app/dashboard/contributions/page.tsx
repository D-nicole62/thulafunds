import Link from "next/link"
import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, Heart, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { getDonationHistory, getReceivedDonationHistory } from "@/app/actions/contribution-actions"
import { formatDonationAmount } from "@/lib/format-donation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const dynamic = "force-dynamic"

export default async function ContributionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [made, received] = await Promise.all([
    getDonationHistory(user.id),
    getReceivedDonationHistory(user.id),
  ])

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />
      <main className="container py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Donation Activity</h1>
          <p className="text-muted-foreground mt-1">
            All contributions you have made and support received on your campaigns.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Contributions You Made ({made.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {made.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="mb-4">You have not made any donations yet.</p>
                  <Link href="/campaigns">
                    <Button>Browse Campaigns</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {made.map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-start gap-3 p-4 border rounded-lg bg-background"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {donation.campaign?.image_url ? (
                          <img
                            src={donation.campaign.image_url}
                            alt={donation.campaign.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-medium text-primary">
                            {donation.campaign?.title?.charAt(0).toUpperCase() ?? "C"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/campaigns/${donation.campaign_id}`}
                              className="font-medium hover:underline"
                            >
                              {donation.campaign?.title ?? "Campaign"}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })}
                              {donation.payment_method ? ` · ${donation.payment_method}` : ""}
                            </p>
                          </div>
                          <div className="font-semibold text-green-600 whitespace-nowrap">
                            {formatDonationAmount(donation.amount, donation.currency)}
                          </div>
                        </div>
                        {donation.message && (
                          <p className="text-sm text-muted-foreground mt-2 italic">"{donation.message}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-red-500" />
                Support Received ({received.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {received.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="mb-4">No one has donated to your campaigns yet.</p>
                  <Link href="/campaigns/create">
                    <Button>Create a Campaign</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {received.map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-start gap-3 p-4 border rounded-lg bg-green-50/50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={donation.contributor?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {donation.anonymous
                            ? "?"
                            : donation.contributor?.full_name?.charAt(0).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {donation.anonymous
                                ? "Anonymous supporter"
                                : donation.contributor?.full_name ?? "Supporter"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {donation.campaign?.title ?? "Your campaign"} ·{" "}
                              {formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="font-semibold text-green-600 whitespace-nowrap">
                            {formatDonationAmount(donation.amount, donation.currency)}
                          </div>
                        </div>
                        {donation.message && !donation.anonymous && (
                          <p className="text-sm text-muted-foreground mt-2 italic">"{donation.message}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
