import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  LIPILA_API_KEY,
  LIPILA_CURRENCY,
  LIPILA_ENDPOINTS,
  isLipilaSuccess,
} from "@/lib/lipila/config"

/**
 * Record a fiat (Lipila mobile money / card) donation.
 * Unlike the on-chain route, this verifies the payment by re-checking the
 * Lipila collection status server-side, then stores the donation using the
 * Lipila referenceId as the unique tx_hash.
 */
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Idempotency: if we've already recorded this reference, return it.
    const existing = await prisma.donation.findUnique({ where: { tx_hash: referenceId } })
    if (existing) {
      return NextResponse.json({
        success: true,
        donation: { id: existing.id, amount: Number(existing.amount), reference: referenceId },
        message: "Donation already recorded",
      })
    }

    // Verify the payment with Lipila (never trust the client's success claim).
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

    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, full_name: "User" },
      update: {},
    })

    const [donation] = await prisma.$transaction([
      prisma.donation.create({
        data: {
          campaign_id: campaignId,
          contributor_id: user.id,
          amount,
          message: message || null,
          anonymous: anonymous || false,
          tx_hash: referenceId,
          payment_method: "lipila",
          status: "completed",
          currency: statusData.currency || LIPILA_CURRENCY,
        },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: { current_amount: { increment: amount }, updated_at: new Date() },
      }),
    ])

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
