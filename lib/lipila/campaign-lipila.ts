/** Whether Lipila (ZMW) totals should drive the public progress UI for this campaign. */
export function campaignAcceptsLipilaDonations(campaign: {
  payment_method?: string | null
  wallet_address?: string | null
  contract_address?: string | null
  donations?: Array<{ payment_method?: string | null }> | null
  contributions?: Array<{ payment_method?: string | null }> | null
}): boolean {
  if (campaign.contract_address) return false

  const method = campaign.payment_method?.toLowerCase()
  if (method === "lipila" || method === "both") return true

  const rows = campaign.donations ?? campaign.contributions ?? []
  if (rows.some((d) => d.payment_method === "lipila")) return true

  return !campaign.wallet_address
}
