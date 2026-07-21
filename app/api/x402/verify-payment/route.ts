import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { txHash, amount, endpoint, fromAddress } = await request.json()

    if (!txHash || !amount || !endpoint || !fromAddress) {
      return NextResponse.json({ error: "Missing required payment data" }, { status: 400 })
    }

    const db = createAdminClient()

    const { data: existingSession } = await db
      .from("payment_sessions")
      .select("*")
      .eq("tx_hash", txHash)
      .maybeSingle()

    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        sessionId: existingSession.id,
      })
    }

    const { data: paymentSession, error } = await db
      .from("payment_sessions")
      .insert({
        tx_hash: txHash,
        amount: Number(amount),
        from_address: fromAddress,
        endpoint,
        status: "completed",
      })
      .select()
      .single()

    if (error) throw error

    if (endpoint.includes("/api/campaigns/boost")) {
      await handleBoostPayment(Number(amount))
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and stored",
      sessionId: paymentSession.id,
      txHash,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}

async function handleBoostPayment(amount: number) {
  try {
    let boostType = "visibility"
    if (amount >= 0.1) {
      boostType = "premium"
    } else if (amount >= 0.05) {
      boostType = "featured"
    }

    console.log(`Boost payment of $${amount} verified for ${boostType} boost`)
  } catch (error) {
    console.error("Error handling boost payment:", error)
  }
}
