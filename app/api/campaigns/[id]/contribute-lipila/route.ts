import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { upsertProfile, incrementCampaignAmount, nowIso } from "@/lib/db/helpers"
import {
  LIPILA_API_KEY,
  LIPILA_CURRENCY,
  LIPILA_ENDPOINTS,
  isLipilaSuccess,
} from "@/lib/lipila/config"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params
    const { referenceId, message, anonymous } = await request.json()

    if (!referenceId) {
      return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
    }

    if (!LIPILA_API_KEY) {
      return NextResponse.json(
        { error: "Lipila is not configured. Set LIPILA_API_KEY." },
        { status: 500 },
      )
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
      .select("id")
      .eq("id", campaignId)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const { data: existing } = await db.from("donations").select("*").eq("tx_hash", referenceId).maybeSingle()
    if (existing) {
      return NextResponse.json({
        success: true,
        donation: { id: existing.id, amount: Number(existing.amount), reference: referenceId },
        message: "Donation already recorded",
      })
    }

    const statusRes = await fetch(
      `${LIPILA_ENDPOINTS.status}?referenceId=${encodeURIComponent(referenceId)}`,
      { headers: { accept: "application/json", "x-api-key": LIPILA_API_KEY } },
    )
    const statusData = await statusRes.json().catch(() => null)

    if (!statusData || !isLipilaSuccess(statusData.status)) {
      return NextResponse.json(
        {
          error: "Payment is not confirmed yet. Please complete the prompt and try again.",
          status: statusData?.status ?? "unknown",
        },
        { status: 402 },
      )
    }

    const amount = Number(statusData.amount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount from gateway" }, { status: 502 })
    }

    await upsertProfile(user.id)

    const { data: donation, error: insertError } = await db
      .from("donations")
      .insert({
        campaign_id: campaignId,
        contributor_id: user.id,
        amount,
        message: message || null,
        anonymous: anonymous || false,
        tx_hash: referenceId,
        payment_method: "lipila",
        status: "completed",
        currency: statusData.currency || LIPILA_CURRENCY,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await incrementCampaignAmount(campaignId, amount)
    await db.from("campaigns").update({ updated_at: nowIso() }).eq("id", campaignId)

    return NextResponse.json({
      success: true,
      donation: {
        id: donation.id,
        amount,
        currency: statusData.currency || LIPILA_CURRENCY,
        reference: referenceId,
        payment_method: "lipila",
      },
      message: "Lipila donation recorded",
    })
  } catch (error) {
    console.error("Lipila donation recording error:", error)
    const msg = error instanceof Error ? error.message : "Failed to record donation"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
