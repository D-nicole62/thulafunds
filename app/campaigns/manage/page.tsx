import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { asNumber } from "@/lib/db/helpers"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DatabaseErrorCard } from "@/components/dashboard/database-error-card"
import { ArrowLeft, Edit, Eye, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ManageCampaignsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  try {
    const db = createAdminClient()
    const { data: campaigns, error } = await db
      .from("campaigns")
      .select("id, title, description, goal_amount, current_amount, status, created_at, image_url, category")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader />
        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Button variant="ghost" size="sm" asChild className="mb-3">
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold">My Campaigns</h1>
                <p className="text-muted-foreground mt-1">
                  View, edit, or delete all campaigns you have created.
                </p>
              </div>
              <Link href="/campaigns/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </Link>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Campaigns ({campaigns?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns && campaigns.length > 0 ? (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => {
                      const progress =
                        (asNumber(campaign.current_amount) / asNumber(campaign.goal_amount || 1)) * 100

                      return (
                        <div
                          key={campaign.id}
                          className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                            {campaign.image_url ? (
                              <img
                                src={campaign.image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {campaign.title?.charAt(0).toUpperCase() || "C"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div>
                                <h3 className="font-semibold truncate">{campaign.title || "Untitled Campaign"}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {campaign.description || "No description"}
                                </p>
                              </div>
                              <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                                {campaign.status || "unknown"}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  ${Number(campaign.current_amount || 0).toLocaleString()} raised
                                </span>
                                <span className="font-medium">
                                  ${Number(campaign.goal_amount || 0).toLocaleString()} goal
                                </span>
                              </div>
                              <Progress value={Math.min(progress, 100)} className="h-2" />
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/campaigns/${campaign.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Link href={`/campaigns/${campaign.id}/edit`}>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <h3 className="font-semibold mb-2">No campaigns yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first campaign to start raising funds.
                    </p>
                    <Link href="/campaigns/create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Campaign
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  } catch (error) {
    console.error("ManageCampaignsPage error:", error)
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader />
        <main className="container py-8">
          <DatabaseErrorCard title="Unable to load campaigns" error={error} />
        </main>
      </div>
    )
  }
}
