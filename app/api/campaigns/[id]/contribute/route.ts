import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { indexDonationFromTx } from "@/lib/stellar/indexer"
import { getTxExplorerUrl } from "@/lib/stellar/config"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params
    const { message, anonymous, txHash, amount } = await request.json()

    if (!txHash || !amount) {
      return NextResponse.json({ error: "txHash and amount are required" }, { status: 400 })
    }

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, contract_address: true, title: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (!campaign.contract_address) {
      return NextResponse.json({ error: "Campaign has no Soroban escrow contract" }, { status: 400 })
    }

    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, full_name: "User" },
      update: {},
    })

    await indexDonationFromTx(
      campaignId,
      txHash,
      user.id,
      Number(amount),
      message,
      anonymous,
    )

    const donation = await prisma.donation.findUnique({ where: { tx_hash: txHash } })

    return NextResponse.json({
      success: true,
      donation: {
        id: donation?.id,
        amount: Number(amount),
        tx_hash: txHash,
        explorer_url: getTxExplorerUrl(txHash),
        message: message || null,
        anonymous: anonymous || false,
      },
      message: "Donation indexed from Stellar ledger",
    })
  } catch (error) {
    console.error("Donation indexing error:", error)
    const msg = error instanceof Error ? error.message : "Failed to record donation"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
