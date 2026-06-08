import { NextResponse } from "next/server"
import { syncAllCampaignBalances } from "@/lib/stellar/indexer"

export async function POST() {
  try {
    const synced = await syncAllCampaignBalances()
    return NextResponse.json({ success: true, synced })
  } catch (error) {
    console.error("Indexer sync error:", error)
    return NextResponse.json({ error: "Indexer sync failed" }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
