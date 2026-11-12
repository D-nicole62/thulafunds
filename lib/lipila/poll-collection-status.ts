import { isLipilaFailure, isLipilaSuccess } from "@/lib/lipila/config"

/** Poll every 3s — mobile money PIN prompts should resolve quickly or time out. */
export const LIPILA_MOMO_POLL_MS = 3_000
/** How long to wait for the payer to enter their PIN on the phone. */
export const LIPILA_MOMO_TIMEOUT_MS = 3 * 60 * 1_000

export const LIPILA_CARD_POLL_MS = 5_000
export const LIPILA_CARD_TIMEOUT_MS = 8 * 60 * 1_000

export type LipilaPollOutcome = "success" | "timeout" | "cancelled"

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

export function formatPaymentTimeLeft(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export async function pollLipilaCollectionStatus(
  referenceId: string,
  options: {
    pollIntervalMs: number
    timeoutMs: number
    signal?: AbortSignal
    onTimeLeft?: (remainingMs: number) => void
  },
): Promise<LipilaPollOutcome> {
  const deadline = Date.now() + options.timeoutMs

  const emitTimeLeft = () => {
    options.onTimeLeft?.(Math.max(0, deadline - Date.now()))
  }

  emitTimeLeft()

  while (Date.now() < deadline) {
    if (options.signal?.aborted) return "cancelled"

    try {
      await sleep(options.pollIntervalMs, options.signal)
    } catch {
      return "cancelled"
    }

    if (options.signal?.aborted) return "cancelled"

    emitTimeLeft()

    const statusRes = await fetch(
      `/api/lipila/status?referenceId=${encodeURIComponent(referenceId)}`,
      { signal: options.signal },
    )
    const statusData = await statusRes.json().catch(() => ({}))
    const status = String(statusData?.status ?? "")

    if (isLipilaSuccess(status)) return "success"
    if (isLipilaFailure(status)) {
      throw new Error(
        statusData?.message ||
          "The payment was not completed. If you did not enter your PIN or approve the prompt, try again.",
      )
    }
  }

  return "timeout"
}

export const LIPILA_TIMEOUT_MESSAGES = {
  momo:
    "Payment timed out. We did not receive your mobile money approval or PIN in time. If you did not approve the prompt, no money was taken. Tap Try Again to send a new prompt.",
  card:
    "Payment timed out. We did not confirm your card payment in time. If you did not finish checkout, no charge was made. Try again or start a new payment.",
  cancelled: "Payment cancelled. You can close this window or try again when ready.",
} as const
