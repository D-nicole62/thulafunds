import { type NextRequest, NextResponse } from "next/server"
import { LIPILA_API_KEY, LIPILA_ENDPOINTS } from "@/lib/lipila/config"
import { lipilaUpstreamToJson } from "@/lib/lipila/upstream"

/**
 * Proxy to Lipila collection status check.
 * GET /api/lipila/status?referenceId=...
 */
export async function GET(request: NextRequest) {
  if (!LIPILA_API_KEY) {
    return NextResponse.json(
      { error: "Lipila is not configured. Set LIPILA_API_KEY in your environment." },
      { status: 500 },
    )
  }

  const referenceId = request.nextUrl.searchParams.get("referenceId")
  if (!referenceId) {
    return NextResponse.json({ error: "referenceId is required" }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `${LIPILA_ENDPOINTS.status}?referenceId=${encodeURIComponent(referenceId)}`,
      { headers: { accept: "application/json", "x-api-key": LIPILA_API_KEY } },
    )
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
  return lipilaUpstreamToJson(upstream, text)
}
