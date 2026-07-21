import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { asNumber } from "@/lib/db/helpers"
import { verifyPaymentSession } from "@/lib/payment"

export async function GET(request: NextRequest) {
  try {
    // 1. Payment Verification
    const verification = await verifyPaymentSession(request.headers, {
      price: 0.005, // Match middleware config
      description: "Premium campaign features"
    })

    if (!verification.verified) {
      const response = new NextResponse(verification.error || "Payment Required", { status: verification.status || 402 })
      // Add x402 headers if needed (simplified here, usually middleware handles standard 402 headers structure,
      // but since we moved logic, we might need to replicate them if the client expects them for the handshake.
      // For now, assuming the client handles 402 generic or we need to add them back.
      // Ideally lib/payment should return the headers to set.)

      // Replicating basic headers for x402 flow
      response.headers.set("WWW-Authenticate", `Bearer realm="x402"`)
      response.headers.set("X-Accept-Payment", "USDC")
      response.headers.set("X-Payment-Amount", "0.005")
      response.headers.set("X-Payment-Network", "stellar")
      response.headers.set("X-Payment-Address", process.env.X402_WALLET_ADDRESS || "")
      return response
    }

    const db = createAdminClient()
    const { data: campaignsRaw, error } = await db
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) throw error

    const campaignIds = (campaignsRaw ?? []).map((c) => c.id)
    const creatorIds = [...new Set((campaignsRaw ?? []).map((c) => c.creator_id))]

    const [{ data: profiles }, { data: allDonations }] = await Promise.all([
      creatorIds.length > 0
        ? db.from("profiles").select("id, full_name, avatar_url").in("id", creatorIds)
        : Promise.resolve({ data: [] }),
      campaignIds.length > 0
        ? db.from("donations").select("amount, created_at, contributor_id, campaign_id").in("campaign_id", campaignIds)
        : Promise.resolve({ data: [] }),
    ])

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
    const donationsByCampaign = new Map<string, typeof allDonations>()
    for (const d of allDonations ?? []) {
      const list = donationsByCampaign.get(d.campaign_id) ?? []
      list.push(d)
      donationsByCampaign.set(d.campaign_id, list)
    }

    const premiumCampaigns = (campaignsRaw ?? []).map((campaign) => {
      const creator = profileMap.get(campaign.creator_id)
      const contributions = donationsByCampaign.get(campaign.id) ?? []

      const momentum = calculateMomentum(contributions)
      const trendingScore = calculateTrendingScore(campaign, contributions)

      return {
        ...campaign,
        profiles: creator,
        premium_insights: {
          momentum_score: momentum,
          trending_score: trendingScore,
          success_probability: calculateSuccessProbability(campaign, contributions),
          optimal_contribution_time: getOptimalContributionTime(contributions),
          social_proof_score: calculateSocialProofScore(contributions),
          x402_payment_enabled: true,
          network: "Stellar Mainnet",
        },
      }
    })

    // Response with payment proof if available
    const response = NextResponse.json({
      campaigns: premiumCampaigns,
      insights: {
        market_trends: await getMarketTrends(db),
        success_factors: await getSuccessFactors(db),
        payment_info: {
          network: "Stellar Mainnet",
          currency: "USDC",
          facilitator: "https://facilitator.x402.org",
        },
      },
    })

    if (verification.proof) {
      response.headers.set("x-payment-proof", JSON.stringify(verification.proof))
    }

    return response

  } catch (error) {
    console.error("Premium campaigns API error:", error)
    return NextResponse.json({ error: "Failed to fetch premium campaign data" }, { status: 500 })
  }
}

function calculateMomentum(contributions: any[]) {
  const recent = contributions.filter((c) => new Date(c.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
  const older = contributions.filter((c) => new Date(c.created_at).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentSum = recent.reduce((sum, c) => sum + Number(c.amount), 0)
  const olderSum = older.reduce((sum, c) => sum + Number(c.amount), 0)

  return olderSum > 0 ? (recentSum / olderSum) * 100 : recentSum > 0 ? 100 : 0
}

function calculateTrendingScore(campaign: any, contributions: any[]) {
  const recency = (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const velocity = contributions.length / Math.max(recency, 1)
  const completion = (Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100

  return Math.min(100, velocity * 30 + completion * 0.5 + 100 / Math.max(recency, 1))
}

function calculateSuccessProbability(campaign: any, contributions: any[]) {
  const completion = (Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100
  const contributorCount = contributions.length
  const avgContribution =
    contributorCount > 0 ? contributions.reduce((sum, c) => sum + Number(c.amount), 0) / contributorCount : 0

  // Simple heuristic based on completion rate, contributor count, and average contribution
  let probability = completion * 0.6
  probability += Math.min(contributorCount * 2, 30)
  probability += Math.min(avgContribution / 10, 10)

  return Math.min(100, Math.max(0, probability))
}

function getOptimalContributionTime(contributions: any[]) {
  const hourCounts = new Array(24).fill(0)

  contributions.forEach((contrib) => {
    const hour = new Date(contrib.created_at).getHours()
    hourCounts[hour]++
  })

  const maxHour = hourCounts.indexOf(Math.max(...hourCounts))
  return `${maxHour}:00 - ${maxHour + 1}:00`
}

function calculateSocialProofScore(contributions: any[]) {
  const uniqueContributors = new Set(contributions.map((c) => c.contributor_id)).size
  const totalContributions = contributions.length
  const repeatRate = totalContributions > 0 ? (totalContributions - uniqueContributors) / totalContributions : 0

  return Math.min(100, uniqueContributors * 2 + repeatRate * 50)
}

async function getMarketTrends(db: ReturnType<typeof createAdminClient>) {
  const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: allCampaigns } = await db
    .from("campaigns")
    .select("category, current_amount, goal_amount")
    .gte("created_at", date30DaysAgo)

  const categoryTrends = (allCampaigns ?? []).reduce((acc: Record<string, { count: number; totalRaised: number; avgSuccess: number }>, campaign) => {
    const category = campaign.category || "Other"
    if (!acc[category]) {
      acc[category] = { count: 0, totalRaised: 0, avgSuccess: 0 }
    }
    acc[category].count++
    acc[category].totalRaised += asNumber(campaign.current_amount)
    acc[category].avgSuccess += (asNumber(campaign.current_amount) / asNumber(campaign.goal_amount)) * 100
    return acc
  }, {})

  Object.keys(categoryTrends || {}).forEach((category) => {
    categoryTrends[category].avgSuccess /= categoryTrends[category].count
  })

  return categoryTrends
}

async function getSuccessFactors(db: ReturnType<typeof createAdminClient>) {
  const { data: campaigns } = await db.from("campaigns").select("goal_amount, current_amount")

  const successfulCampaigns = (campaigns ?? []).filter(
    (c) => asNumber(c.current_amount) >= asNumber(c.goal_amount) * 0.8,
  )

  return {
    avg_goal_amount:
      successfulCampaigns.reduce((sum, c) => sum + asNumber(c.goal_amount), 0) / (successfulCampaigns.length || 1),
    common_categories: ["Technology", "Creative", "Community"],
    optimal_duration: "30-45 days",
    key_factors: [
      "Clear, compelling story",
      "Regular updates",
      "Strong social media presence",
      "Early momentum in first week",
    ],
  }
}
