/** Client-side helpers for deploying and registering Soroban campaign escrows */

/** Deterministic 32-byte salt from campaign UUID (factory requires fixed-length salt). */
export async function generateCampaignSalt(campaignId: string): Promise<Buffer> {
  const data = new TextEncoder().encode(campaignId)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Buffer.from(hash)
}

export async function registerCampaignContract(
  campaignId: string,
  contractAddress: string,
  deployTxHash: string,
  deadline: Date,
): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contract_address: contractAddress,
      deploy_tx_hash: deployTxHash,
      deadline: deadline.toISOString(),
    }),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || "Failed to register Soroban contract")
  }
}

/** Default campaign deadline: 90 days from now at end of day UTC. */
export function defaultCampaignDeadline(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 90)
  d.setUTCHours(23, 59, 59, 0)
  return d
}

/** Format YYYY-MM-DD for <input type="date"> */
export function formatDeadlineInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}
