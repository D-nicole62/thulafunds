import { type NextRequest, NextResponse } from "next/server"
import { parseCampaignIdFromReferenceData } from "@/lib/lipila/reference-data"
import {
  recordLipilaDonationFromStatus,
  type LipilaStatusPayload,
} from "@/lib/lipila/record-donation"
import { getApiErrorMessage } from "@/lib/db-errors"
import { isLipilaFailure } from "@/lib/lipila/config"

/**
 * Lipila async callback when a collection succeeds or fails.
 * Set LIPILA_CALLBACK_URL=https://www.thulafunds.com/api/lipila/callback in production.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => null)) as LipilaStatusPayload | null
    if (!payload?.referenceId) {
      return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
    }

    if (isLipilaFailure(payload.status)) {
      return NextResponse.json({ ok: true, ignored: true, status: payload.status })
    }

    const campaignId = parseCampaignIdFromReferenceData(payload.referenceData)
    if (!campaignId) {
      console.warn("Lipila callback missing campaignId in referenceData:", payload.referenceId)
      return NextResponse.json({ ok: true, ignored: true, reason: "missing_campaign_id" })
    }

    const result = await recordLipilaDonationFromStatus(campaignId, payload, { anonymous: true })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("Lipila callback error:", error)
    return NextResponse.json(
      { error: getApiErrorMessage(error, "Failed to process Lipila callback") },
      { status: 500 },
    )
  }
}
