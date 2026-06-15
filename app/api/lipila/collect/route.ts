import { type NextRequest, NextResponse } from "next/server"
import {
  LIPILA_API_KEY,
  LIPILA_CALLBACK_URL,
  LIPILA_ENDPOINTS,
} from "@/lib/lipila/config"

/**
 * Server-side proxy to Lipila collections (mobile money / card).
 * Keeps the Lipila secret key on the server. Mirrors the reference PHP proxy:
 * accepts { type: "momo" | "card", data: {...} } and forwards `data` upstream.
 */
export async function POST(request: NextRequest) {
  if (!LIPILA_API_KEY) {
    return NextResponse.json(
      { error: "Lipila is not configured. Set LIPILA_API_KEY in your environment." },
      { status: 500 },
    )
  }

  let body: { type?: string; data?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.data) {
    return NextResponse.json({ error: "Missing payment data" }, { status: 400 })
  }

  const type = body.type === "card" ? "card" : "momo"
  const url = type === "card" ? LIPILA_ENDPOINTS.card : LIPILA_ENDPOINTS.momo

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": LIPILA_API_KEY,
    accept: "application/json",
  }
  if (LIPILA_CALLBACK_URL) headers.callbackUrl = LIPILA_CALLBACK_URL

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body.data),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not reach the payment gateway. Please try again.",
        detail: error instanceof Error ? error.message : "Network request failed",
      },
      { status: 502 },
    )
  }

  const text = await upstream.text()
  const trimmed = text.trimStart()

  // Upstream sometimes returns an HTML error page instead of JSON.
  if (
    trimmed.toUpperCase().startsWith("<!DOCTYPE") ||
    trimmed.toLowerCase().startsWith("<html")
  ) {
    return NextResponse.json(
      {
        error: "The payment gateway returned an unexpected response. Please try again later.",
        detail: `Upstream returned HTML (HTTP ${upstream.status})`,
      },
      { status: 502 },
    )
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(text)
  } catch {
    return NextResponse.json(
      {
        error: "The payment gateway returned an invalid response. Please try again later.",
        detail: `Invalid JSON from upstream (HTTP ${upstream.status})`,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(decoded, { status: upstream.status })
}
