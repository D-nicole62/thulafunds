/** Format a donation amount with its stored currency (ZMW, USDC, USD, etc.). */
export function formatDonationAmount(
  amount: number | string,
  currency?: string | null,
): string {
  const value = Number(amount ?? 0)
  const code = (currency || "USD").toUpperCase()

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
