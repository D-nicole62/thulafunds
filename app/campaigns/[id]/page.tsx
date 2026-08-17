import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view"
import { asNumber, syncCampaignAmountFromDonations } from "@/lib/db/helpers"
import { isCompletedDonation } from "@/lib/format-donation"
import type { Donation, Profile } from "@/lib/db/types"

interface CampaignPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id: campaignId } = await params
  const db = createAdminClient()

  const { data: campaignData, error } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("status", "active")
    .maybeSingle()

  if (error || !campaignData) {
    notFound()
  }

  const [{ data: creator }, { data: campaign_updates }, { data: donationsRaw }] = await Promise.all([
    db.from("profiles").select("*").eq("id", campaignData.creator_id).maybeSingle(),
    db.from("campaign_updates").select("*").eq("campaign_id", campaignId),
    db
      .from("donations")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
  ])

  const contributorIds = [
    ...new Set(
      (donationsRaw ?? [])
        .map((d) => d.contributor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const { data: contributors } =
    contributorIds.length > 0
      ? await db.from("profiles").select("*").in("id", contributorIds)
      : { data: [] as Profile[] }

  const contributorMap = new Map((contributors ?? []).map((p) => [p.id, p]))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUser = user
    ? { id: user.id, email: user.email ?? undefined, full_name: user.user_metadata?.full_name }
    : null

  const donations = (donationsRaw ?? [])
    .filter((d) => isCompletedDonation(d.status))
    .map((d: Donation) => ({
      ...d,
      amount: asNumber(d.amount),
      profiles: contributorMap.get(d.contributor_id) ?? null,
      contributor: contributorMap.get(d.contributor_id) ?? null,
    }))

  const donationsTotal = donations.reduce((sum, d) => sum + d.amount, 0)
  const cachedAmount = asNumber(campaignData.current_amount)
  const hasEscrow = Boolean(campaignData.contract_address)
  const displayAmount = hasEscrow ? cachedAmount : Math.max(cachedAmount, donationsTotal)

  // Keep lipila-only campaign totals in sync when trigger/backfill was missed.
  if (!hasEscrow && donationsTotal > cachedAmount) {
    await syncCampaignAmountFromDonations(campaignId).catch((err) => {
      console.error("Campaign amount sync failed:", err)
    })
  }

  const campaign = {
    ...campaignData,
    current_amount: displayAmount,
    on_chain_balance: asNumber(campaignData.on_chain_balance),
    goal_amount: asNumber(campaignData.goal_amount),
    deadline: campaignData.deadline ?? undefined,
    profiles: creator,
    creator,
    donations,
    contributions: donations,
    campaign_updates: (campaign_updates ?? []).map((u) => ({
      ...u,
      created_at: u.created_at,
    })),
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <CampaignDetailView
        campaign={campaign as any}
        contributions={campaign.contributions}
        updates={campaign.campaign_updates || []}
        currentUser={currentUser}
      />
    </div>
  )
}

export async function generateMetadata({ params }: CampaignPageProps) {
  const { id: campaignId } = await params
  const db = createAdminClient()

  const { data: campaign } = await db
    .from("campaigns")
    .select("title, description, image_url")
    .eq("id", campaignId)
    .maybeSingle()

  if (!campaign) return { title: "Campaign Not Found" }

  return {
    title: `${campaign.title} - Thula Funds`,
    description: campaign.description?.slice(0, 160) + "...",
    openGraph: {
      title: campaign.title,
      description: campaign.description,
      images: campaign.image_url ? [campaign.image_url] : [],
    },
  }
}
