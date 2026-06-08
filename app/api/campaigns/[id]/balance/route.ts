import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCrowdfundBalance, getCrowdfundGoal } from "@/lib/stellar/soroban"
import { syncCampaignBalance } from "@/lib/stellar/indexer"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        contract_address: true,
        goal_amount: true,
        on_chain_balance: true,
        current_amount: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (!campaign.contract_address) {
      return NextResponse.json({
        balance: Number(campaign.current_amount),
        goal: Number(campaign.goal_amount),
        source: "cache",
      })
    }

    const [balance, goal] = await Promise.all([
      getCrowdfundBalance(campaign.contract_address),
      getCrowdfundGoal(campaign.contract_address).catch(
        () => Number(campaign.goal_amount),
      ),
    ])

    syncCampaignBalance(id).catch(console.error)

    return NextResponse.json({
      balance,
      goal,
      contract_address: campaign.contract_address,
      source: "soroban",
      explorer_url: `https://stellar.expert/explorer/${process.env.NEXT_PUBLIC_STELLAR_NETWORK === "testnet" ? "testnet" : "public"}/contract/${campaign.contract_address}`,
    })
  } catch (error) {
    console.error("Balance API error:", error)
    return NextResponse.json({ error: "Failed to fetch on-chain balance" }, { status: 500 })
  }
}
