import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Target, TrendingUp } from "lucide-react"
import { DatabaseErrorCard } from "@/components/dashboard/database-error-card"
import { asNumber } from "@/lib/db/helpers"
import { formatDonationAmount, isCampaignGoalReached } from "@/lib/format-donation"

interface DashboardStatsProps {
  userId: string
}

export async function DashboardStats({ userId }: DashboardStatsProps) {
  try {
    const db = createAdminClient()

    const { data: campaigns } = await db
      .from("campaigns")
      .select("current_amount, goal_amount, payment_method")
      .eq("creator_id", userId)

    const totalRaised = (campaigns ?? []).reduce((sum, campaign) => sum + asNumber(campaign.current_amount), 0)
    const totalGoal = (campaigns ?? []).reduce((sum, campaign) => sum + asNumber(campaign.goal_amount), 0)
    const activeCampaigns = campaigns?.length ?? 0
    const fundedCampaigns = (campaigns ?? []).filter((c) =>
      isCampaignGoalReached(asNumber(c.current_amount), asNumber(c.goal_amount)),
    ).length
    const primaryCurrency =
      campaigns?.find((c) => c.payment_method === "lipila")?.payment_method === "lipila" ? "ZMW" : "USD"

    const stats = [
      {
        title: "Total Raised",
        value: formatDonationAmount(totalRaised, primaryCurrency),
        description: "Across your campaigns",
        icon: DollarSign,
      },
      {
        title: "Active Campaigns",
        value: activeCampaigns.toString(),
        description: "Currently fundraising",
        icon: Target,
      },
      {
        title: "Goals Reached",
        value: fundedCampaigns.toString(),
        description: "Campaigns fully funded",
        icon: TrendingUp,
      },
    ]

    return (
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              {stat.title === "Total Raised" && totalGoal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((totalRaised / totalGoal) * 100)}% of combined goals
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  } catch (error) {
    console.error("DashboardStats error:", error)
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <DatabaseErrorCard title="Error loading stats" error={error} />
      </div>
    )
  }
}
