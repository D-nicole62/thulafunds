import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view"

interface CampaignPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id: campaignId } = await params

  const campaignData = await prisma.campaign.findUnique({
    where: { id: campaignId, status: "active" },
    include: {
      creator: true,
      campaign_updates: true,
      donations: {
        include: { contributor: true },
        orderBy: { created_at: "desc" },
      },
    },
  })

  if (!campaignData) {
    notFound()
  }

  const campaign = {
    ...campaignData,
    current_amount: Number(campaignData.current_amount),
    on_chain_balance: Number(campaignData.on_chain_balance),
    goal_amount: Number(campaignData.goal_amount),
    deadline: campaignData.deadline?.toISOString(),
    profiles: campaignData.creator,
    donations: campaignData.donations.map((d) => ({
      ...d,
      amount: Number(d.amount),
      tx_hash: d.tx_hash,
      profiles: d.contributor,
    })),
    contributions: campaignData.donations.map((d) => ({
      ...d,
      amount: Number(d.amount),
      tx_hash: d.tx_hash,
      profiles: d.contributor,
    })),
    campaign_updates: campaignData.campaign_updates.map((u) => ({
      ...u,
      created_at: u.created_at.toISOString(),
    })),
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <CampaignDetailView
        campaign={campaign as any}
        contributions={campaign.contributions}
        updates={campaign.campaign_updates || []}
        currentUser={null}
      />
    </div>
  )
}

export async function generateMetadata({ params }: CampaignPageProps) {
  const { id: campaignId } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { title: true, description: true, image_url: true },
  })

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
