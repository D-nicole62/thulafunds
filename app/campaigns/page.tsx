import { createAdminClient } from "@/lib/supabase/admin"
import { CampaignGrid } from "@/components/campaigns/campaign-grid"
import { CampaignFilters } from "@/components/campaigns/campaign-filters"
import { Button } from "@/components/ui/button"
import { Plus, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { asNumber } from "@/lib/db/helpers"
import { isCompletedDonation } from "@/lib/format-donation"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
  try {
    const db = createAdminClient()
    const { data: campaignsData, error } = await db
      .from("campaigns")
      .select(
        "id, title, description, goal_amount, current_amount, image_url, category, created_at, creator_id, contract_address, payment_method",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) throw error

    const campaignIds = (campaignsData ?? []).map((c) => c.id)
    const { data: donationsRaw } =
      campaignIds.length > 0
        ? await db.from("donations").select("campaign_id, amount, status").in("campaign_id", campaignIds)
        : { data: [] }

    const raisedByCampaign = new Map<string, number>()
    for (const d of donationsRaw ?? []) {
      if (!isCompletedDonation(d.status)) continue
      const id = d.campaign_id
      raisedByCampaign.set(id, (raisedByCampaign.get(id) ?? 0) + asNumber(d.amount))
    }

    const creatorIds = [...new Set((campaignsData ?? []).map((c) => c.creator_id))]
    const { data: profiles } =
      creatorIds.length > 0
        ? await db.from("profiles").select("id, full_name, avatar_url").in("id", creatorIds)
        : { data: [] }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const campaigns = (campaignsData ?? []).map((c) => {
      const fromDonations = raisedByCampaign.get(c.id) ?? 0
      const cached = asNumber(c.current_amount)
      const current_amount = c.contract_address ? cached : Math.max(cached, fromDonations)
      return {
        ...c,
        creator: profileMap.get(c.creator_id) ?? null,
        profiles: profileMap.get(c.creator_id) ?? null,
        goal_amount: asNumber(c.goal_amount),
        current_amount,
        payment_method: c.payment_method,
      }
    })

    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Browse Campaigns</h1>
              <p className="text-muted-foreground">Discover and support amazing causes from our community</p>
            </div>
            <Link href="/campaigns/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Start Campaign
              </Button>
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <CampaignFilters />
            </div>
            <div className="lg:col-span-3">
              <CampaignGrid campaigns={campaigns} />
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Campaigns page error:", error)
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We encountered an error connecting to our services. This is usually due to missing environment variables or database configuration.
            </p>
            <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-32">
              {String(error)}
            </div>
            <Button asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}
