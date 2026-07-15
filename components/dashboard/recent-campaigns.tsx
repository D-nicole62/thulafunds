import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Eye, Edit } from "lucide-react"
import { DatabaseErrorCard } from "@/components/dashboard/database-error-card"

interface RecentCampaignsProps {
  userId: string
}

export async function RecentCampaigns({ userId }: RecentCampaignsProps) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { creator_id: userId },
      select: {
        id: true,
        title: true,
        description: true,
        goal_amount: true,
        current_amount: true,
        status: true,
        created_at: true,
        image_url: true,
        category: true,
      },
      orderBy: { created_at: "desc" },
      take: 5,
    })

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Campaigns</CardTitle>
          <Link href="/campaigns/create">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const progress = (Number(campaign.current_amount || 0) / Number(campaign.goal_amount || 1)) * 100
                const isCompleted = progress >= 100

                return (
                  <div
                    key={campaign.id}
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                      {campaign.image_url ? (
                        <img
                          src={campaign.image_url || "/placeholder.svg"}
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
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm truncate">{campaign.title || "Untitled Campaign"}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {campaign.description || "No description"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="text-xs">
                            {campaign.status || "unknown"}
                          </Badge>
                          {campaign.category && (
                            <Badge variant="outline" className="text-xs">
                              {campaign.category}
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {progress.toFixed(1)}% funded
                            {isCompleted && " 🎉"}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Link href={`/campaigns/${campaign.id}`}>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/campaigns/${campaign.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first campaign to start raising funds for your cause.
              </p>
              <Link href="/campaigns/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          )}

          {campaigns && campaigns.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Link href="/campaigns/manage">
                <Button variant="outline" className="w-full bg-transparent">
                  View All Campaigns
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error("RecentCampaigns error:", error)
    return <DatabaseErrorCard title="Unable to load campaigns" error={error} />
  }
}

