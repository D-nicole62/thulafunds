import { isLipilaFailure, isLipilaSuccess } from "@/lib/lipila/config"

/** Poll every 3s — mobile money PIN prompts should resolve quickly or time out. */
export const LIPILA_MOMO_POLL_MS = 3_000
/** How long to wait for the payer to enter their PIN on the phone. */
export const LIPILA_MOMO_TIMEOUT_MS = 60 * 1_000

export const LIPILA_CARD_POLL_MS = 5_000
export const LIPILA_CARD_TIMEOUT_MS = 3 * 60 * 1_000

export type LipilaPollResult =
  | { outcome: "success" }
  | { outcome: "timeout" }
  | { outcome: "cancelled" }
  | { outcome: "failed"; message: string }

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
): Promise<LipilaPollResult> {
  const deadline = Date.now() + options.timeoutMs

  const emitTimeLeft = () => {
    options.onTimeLeft?.(Math.max(0, deadline - Date.now()))
  }

  emitTimeLeft()

  while (Date.now() < deadline) {
    if (options.signal?.aborted) return { outcome: "cancelled" }

    try {
      await sleep(options.pollIntervalMs, options.signal)
    } catch {
      return { outcome: "cancelled" }
    }

    if (options.signal?.aborted) return { outcome: "cancelled" }

    emitTimeLeft()

    const statusRes = await fetch(
      `/api/lipila/status?referenceId=${encodeURIComponent(referenceId)}`,
      { signal: options.signal },
    )
    const statusData = await statusRes.json().catch(() => ({}))
    const status = String(statusData?.status ?? "")

    if (isLipilaSuccess(status)) return { outcome: "success" }
    if (isLipilaFailure(status)) {
      return {
        outcome: "failed",
        message:
          statusData?.message ||
          "The payment was not completed. If you did not enter your PIN or approve the prompt, try again.",
      }
    }
  }

  return { outcome: "timeout" }
}

export const LIPILA_TIMEOUT_MESSAGES = {
  momo:
    "Payment timed out on this page. If you already approved on your phone, tap 'I approved on my phone — confirm payment'. Otherwise no money was taken unless you entered your PIN.",
  momoDeclined:
    "The payment was cancelled or declined on your phone. No money was taken. Tap 'Send new prompt' only when you want to try again.",
  card:
    "Payment timed out. We did not confirm your card payment in time. If you did not finish checkout, no charge was made. Try again or start a new payment.",
  cancelled:
    "Payment stopped on this page. Your phone will not be prompted again until you tap 'Send new prompt'.",
} as const
