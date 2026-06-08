import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPaymentSession } from "@/lib/payment"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    // 1. Payment Verification
    const verification = await verifyPaymentSession(request.headers, {
      price: 0.01, // Match middleware config
      description: "Detailed campaign analytics"
    })

    if (!verification.verified) {
      // Return 402 if payment missing or invalid
      const response = new NextResponse(verification.error || "Payment Required", { status: verification.status || 402 })
      response.headers.set("WWW-Authenticate", `Bearer realm="x402"`)
      response.headers.set("X-Accept-Payment", "USDC")
      response.headers.set("X-Payment-Amount", "0.01")
      response.headers.set("X-Payment-Network", "stellar")
      response.headers.set("X-Payment-Address", process.env.X402_WALLET_ADDRESS || "")
      return response
    }

    // Fetch detailed analytics data
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        donations: {
          select: {
            amount: true,
            created_at: true,
            contributor_id: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Calculate detailed metrics
    const contributions = campaign.donations || []
    const dailyContributions = contributions.reduce((acc: any, contrib: any) => {
      const date = new Date(contrib.created_at).toISOString().split("T")[0]
      acc[date] = (acc[date] || 0) + Number(contrib.amount)
      return acc
    }, {})

    const uniqueContributors = new Set(contributions.map((c: any) => c.contributor_id)).size
    const averageContribution =
      contributions.length > 0
        ? contributions.reduce((sum: number, c: any) => sum + Number(c.amount), 0) / contributions.length
        : 0

    const analytics = {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        current_amount: campaign.current_amount,
        goal_amount: campaign.goal_amount,
      },
      metrics: {
        total_contributions: contributions.length,
        unique_contributors: uniqueContributors,
        average_contribution: averageContribution,
        completion_rate: (Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100,
      },
      daily_contributions: dailyContributions,
      growth_rate: calculateGrowthRate(contributions),
      projected_completion: calculateProjectedCompletion(campaign, contributions),
      payment_info: {
        network: "Stellar Mainnet",
        currency: "USDC",
        verified: true,
        session: verification.proof || {},
      },
    }

    const response = NextResponse.json(analytics)
    if (verification.proof) {
      response.headers.set("x-payment-proof", JSON.stringify(verification.proof))
    }
    return response

  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

function calculateGrowthRate(contributions: any[]) {
  if (contributions.length < 2) return 0

  const sortedContribs = contributions.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const firstHalf = sortedContribs.slice(0, Math.floor(sortedContribs.length / 2))
  const secondHalf = sortedContribs.slice(Math.floor(sortedContribs.length / 2))

  const firstHalfSum = firstHalf.reduce((sum, c) => sum + Number(c.amount), 0)
  const secondHalfSum = secondHalf.reduce((sum, c) => sum + Number(c.amount), 0)

  return firstHalfSum > 0 ? ((secondHalfSum - firstHalfSum) / firstHalfSum) * 100 : 0
}

function calculateProjectedCompletion(campaign: any, contributions: any[]) {
  if (contributions.length === 0) return null

  const dailyAverage = contributions.reduce((sum, c) => sum + Number(c.amount), 0) / 30 // 30-day average
  const remaining = Number(campaign.goal_amount) - Number(campaign.current_amount)
  const daysToCompletion = Math.ceil(remaining / dailyAverage)

  return {
    days_remaining: daysToCompletion,
    projected_date: new Date(Date.now() + daysToCompletion * 24 * 60 * 60 * 1000).toISOString(),
  }
}
