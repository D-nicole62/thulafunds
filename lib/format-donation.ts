/** Primary display currency for campaigns and Lipila (Zambian Kwacha). */
export const DISPLAY_CURRENCY = (
  process.env.NEXT_PUBLIC_LIPILA_CURRENCY || "ZMW"
).toUpperCase()

/** Format amounts on campaign cards, progress bars, and dashboards. */
export function formatCampaignAmount(amount: number | string): string {
  return formatDonationAmount(amount, DISPLAY_CURRENCY)
}

/** Format a donation amount with its stored currency (ZMW, USDC, USD, etc.). */
export function formatDonationAmount(
  amount: number | string,
  currency?: string | null,
): string {
  const value = Number(amount ?? 0)
  const code = (currency || DISPLAY_CURRENCY).toUpperCase()

  try {
    return new Intl.NumberFormat(code === "ZMW" ? "en-ZM" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "ZMW" ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${code} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/** Donations that should appear in public lists. */
export function isCompletedDonation(status?: string | null): boolean {
  if (!status) return true
  return status.toLowerCase() === "completed"
}

export function isCampaignGoalReached(raised: number, goal: number): boolean {
  return goal > 0 && raised >= goal
}

export function campaignProgressPercent(raised: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min((raised / goal) * 100, 100)
}
