import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Target, Users, TrendingUp, AlertTriangle } from "lucide-react"

interface DashboardStatsProps {
  userId: string
}

export async function DashboardStats({ userId }: DashboardStatsProps) {
  try {
    // Fetch campaigns created by user
    const campaigns = await prisma.campaign.findMany({
      where: { creator_id: userId },
      select: {
        current_amount: true,
        goal_amount: true,
      },
    })

    // Fetch contributions made by user
    const contributions = await prisma.donation.findMany({
      where: { contributor_id: userId },
      select: {
        amount: true,
      },
    })

    const totalRaised = campaigns.reduce((sum, campaign) => sum + Number(campaign.current_amount || 0), 0)
    const totalGoal = campaigns.reduce((sum, campaign) => sum + Number(campaign.goal_amount || 0), 0)
    const totalContributed = contributions.reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0)
    const activeCampaigns = campaigns.length

    const stats = [
      {
        title: "Total Raised",
        value: `$${totalRaised.toLocaleString()}`,
        description: "Across all campaigns",
        icon: DollarSign,
      },
      {
        title: "Active Campaigns",
        value: activeCampaigns.toString(),
        description: "Currently fundraising",
        icon: Target,
      },
      {
        title: "Total Contributed",
        value: `$${totalContributed.toLocaleString()}`,
        description: "To other campaigns",
        icon: Users,
      },
      {
        title: "Success Rate",
        value: totalGoal > 0 ? `${Math.round((totalRaised / totalGoal) * 100)}%` : "0%",
        description: "Of funding goals",
        icon: TrendingUp,
      },
    ]

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  } catch (error) {
    console.error("DashboardStats error:", error)

    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                Unable to load dashboard statistics.
              </p>
              <div className="bg-red-100 p-3 rounded-md">
                <p className="text-xs font-mono text-red-800">
                  Error: {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

