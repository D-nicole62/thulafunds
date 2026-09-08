/** Client-safe Lipila referenceData helpers (no server imports). */

export function parseCampaignIdFromReferenceData(referenceData?: string | null): string | null {
  if (!referenceData?.trim()) return null
  const trimmed = referenceData.trim()
  try {
    const parsed = JSON.parse(trimmed) as { campaignId?: string; campaign_id?: string }
    return parsed.campaignId ?? parsed.campaign_id ?? null
  } catch {
    const uuidMatch = trimmed.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )
    return uuidMatch?.[0] ?? null
  }
}

export function lipilaReferenceData(campaignId: string): string {
  return JSON.stringify({ campaignId })
}
