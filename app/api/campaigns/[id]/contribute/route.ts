import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { upsertProfile } from "@/lib/db/helpers"
import { indexDonationFromTx, indexDirectDonationFromTx } from "@/lib/stellar/indexer"
import { getTxExplorerUrl } from "@/lib/stellar/config"
import { getApiErrorMessage } from "@/lib/db-errors"

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

    const db = createAdminClient()
    const { data: campaign, error: campaignError } = await db
      .from("campaigns")
      .select("id, contract_address, wallet_address, title")
      .eq("id", campaignId)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (!campaign.contract_address && !campaign.wallet_address) {
      return NextResponse.json(
        { error: "Campaign has no payment destination configured" },
        { status: 400 },
      )
    }

    await upsertProfile(user.id)

    if (campaign.contract_address) {
      await indexDonationFromTx(
        campaignId,
        txHash,
        user.id,
        Number(amount),
        message,
        anonymous,
      )
    } else {
      await indexDirectDonationFromTx(
        campaignId,
        txHash,
        user.id,
        Number(amount),
        message,
        anonymous,
      )
    }

    const { data: donation } = await db.from("donations").select("*").eq("tx_hash", txHash).maybeSingle()

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/contributions")
    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${campaignId}`)

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
    const msg = getApiErrorMessage(error, "Failed to record donation")
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
