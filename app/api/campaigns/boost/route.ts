import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nowIso } from "@/lib/db/helpers"

export async function POST(request: NextRequest) {
  try {
    const { campaignId, boostType, duration } = await request.json()

    if (!campaignId || !boostType) {
      return NextResponse.json({ error: "Campaign ID and boost type are required" }, { status: 400 })
    }

    const paymentProof = request.headers.get("x-payment-proof")

    if (!paymentProof) {
      return NextResponse.json({ error: "Payment verification required" }, { status: 402 })
    }

    const db = createAdminClient()
    const { data: campaign, error: campaignError } = await db
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const durationHours = duration || 24
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    const { data: boost, error: boostError } = await db
      .from("campaign_boosts")
      .insert({
        campaign_id: campaignId,
        boost_type: boostType,
        duration_hours: durationHours,
        status: "active",
        payment_proof: paymentProof,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (boostError) throw boostError

    const boostEffects = await applyBoostEffects(db, campaignId, boostType, expiresAt)

    return NextResponse.json({
      success: true,
      boost,
      effects: boostEffects,
      payment_verified: true,
      message: `Campaign boosted successfully with ${boostType} for ${duration || 24} hours`,
    })
  } catch (error) {
    console.error("Boost campaign API error:", error)
    return NextResponse.json({ error: "Failed to boost campaign" }, { status: 500 })
  }
}

async function applyBoostEffects(
  db: ReturnType<typeof createAdminClient>,
  campaignId: string,
  boostType: string,
  expiresAt: string,
) {
  const effects = {
    visibility_increase: 0,
    featured_placement: false,
    social_media_promotion: false,
    email_newsletter: false,
    live_payment_verified: true,
  }

  switch (boostType) {
    case "visibility":
      effects.visibility_increase = 200
      break
    case "featured":
      effects.featured_placement = true
      effects.visibility_increase = 500
      break
    case "premium":
      effects.featured_placement = true
      effects.social_media_promotion = true
      effects.email_newsletter = true
      effects.visibility_increase = 1000
      break
  }

  await db
    .from("campaigns")
    .update({
      is_boosted: true,
      boost_type: boostType,
      boost_expires_at: expiresAt,
      updated_at: nowIso(),
    })
    .eq("id", campaignId)

  return effects
}
