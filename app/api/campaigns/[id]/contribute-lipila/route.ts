import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getApiErrorMessage } from "@/lib/db-errors"
import { upsertProfile } from "@/lib/db/helpers"
import {
  LIPILA_API_KEY,
  LIPILA_ENDPOINTS,
} from "@/lib/lipila/config"
import { recordLipilaDonationFromStatus } from "@/lib/lipila/record-donation"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params
    const { referenceId, message, anonymous, donorName } = await request.json()

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

    const db = createAdminClient()

    const { data: campaign, error: campaignError } = await db
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const statusRes = await fetch(
      `${LIPILA_ENDPOINTS.status}?referenceId=${encodeURIComponent(referenceId)}`,
      { headers: { accept: "application/json", "x-api-key": LIPILA_API_KEY } },
    )
    const statusData = await statusRes.json().catch(() => null)

    if (!statusData) {
      return NextResponse.json({ error: "Could not verify payment with Lipila" }, { status: 502 })
    }

    if (user) {
      await upsertProfile(user.id)
    }

    const trimmedDonorName =
      typeof donorName === "string" && donorName.trim() ? donorName.trim().slice(0, 120) : null

    const result = await recordLipilaDonationFromStatus(campaignId, statusData, {
      contributorId: user?.id ?? null,
      donorName: trimmedDonorName,
      message: message || null,
      anonymous: anonymous || false,
    })

    return NextResponse.json({
      success: true,
      donation: {
        id: result.donationId,
        amount: result.amount,
        currency: statusData.currency,
        reference: referenceId,
        payment_method: "lipila",
      },
      message: result.created ? "Lipila donation recorded" : "Donation already recorded",
    })
  } catch (error) {
    console.error("Lipila donation recording error:", error)
    const msg = getApiErrorMessage(error, "Failed to record donation")
    const status = msg.includes("not confirmed") ? 402 : 500
    return NextResponse.json({ error: msg, status }, { status })
  }
}
