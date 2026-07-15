import { NextResponse } from "next/server"

/** Map Lipila HTTP responses (including empty bodies) to a client-safe JSON payload. */
export function lipilaUpstreamToJson(upstream: Response, text: string): NextResponse {
  const trimmed = text.trim()
  const status = upstream.status

  if (!trimmed) {
    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          error:
            "Lipila rejected the API key. Copy the secret key from Lipila Dashboard → Wallets → API Keys into LIPILA_API_KEY (test key for sandbox, live key for production).",
          detail: `HTTP ${status} (empty response body)`,
        },
        { status: 502 },
      )
    }
    return NextResponse.json(
      {
        error: "The payment gateway returned an empty response. Please try again later.",
        detail: `Empty body from upstream (HTTP ${status})`,
      },
      { status: 502 },
    )
  }

  if (
    trimmed.toUpperCase().startsWith("<!DOCTYPE") ||
    trimmed.toLowerCase().startsWith("<html")
  ) {
    return NextResponse.json(
      {
        error: "The payment gateway returned an unexpected response. Please try again later.",
        detail: `Upstream returned HTML (HTTP ${status})`,
      },
      { status: 502 },
    )
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(trimmed)
  } catch {
    return NextResponse.json(
      {
        error: "The payment gateway returned an invalid response. Please try again later.",
        detail: `Invalid JSON from upstream (HTTP ${status}): ${trimmed.slice(0, 200)}`,
      },
      { status: 502 },
    )
  }

  // Lipila error JSON — surface a readable message when upstream is not 2xx
  if (!upstream.ok && decoded && typeof decoded === "object") {
    const obj = decoded as Record<string, unknown>
    const lipilaMessage =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.error === "string" && obj.error) ||
      (Array.isArray(obj.errors) && obj.errors[0]
        ? String(obj.errors[0])
        : null)

    if (lipilaMessage) {
      return NextResponse.json(
        {
          error: lipilaMessage,
          errors: obj.errors,
          lipila: decoded,
        },
        { status: upstream.status },
      )
    }
  }

  return NextResponse.json(decoded, { status: upstream.status })
}
