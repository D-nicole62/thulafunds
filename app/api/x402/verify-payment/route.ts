import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { txHash, amount, endpoint, fromAddress, recipientAddress } = await request.json()

    if (!txHash || !amount || !endpoint || !fromAddress) {
      return NextResponse.json({ error: "Missing required payment data" }, { status: 400 })
    }

    // Check if session exists
    const existingSession = await prisma.paymentSession.findUnique({
      where: { tx_hash: txHash }
    })

    if (existingSession) {
      // Basic check if other fields match could be added here
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        sessionId: existingSession.id
      })
    }

    // Store payment session
    const paymentSession = await prisma.paymentSession.create({
      data: {
        tx_hash: txHash,
        amount: Number(amount), // Ensure number/decimal compatibility
        from_address: fromAddress,
        endpoint: endpoint,
        status: "completed",
      }
    })

    // If this payment is for a campaign boost, handle it
    if (endpoint.includes("/api/campaigns/boost")) {
      await handleBoostPayment(txHash, amount, fromAddress, recipientAddress)
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and stored",
      sessionId: paymentSession.id,
      txHash: txHash
    })

  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}

async function handleBoostPayment(
  txHash: string,
  amount: number,
  fromAddress: string,
  recipientAddress?: string
) {
  try {
    // Determine boost type based on amount
    let boostType = "visibility"
    if (amount >= 0.10) {
      boostType = "premium"
    } else if (amount >= 0.05) {
      boostType = "featured"
    }

    console.log(`Boost payment of $${amount} verified for ${boostType} boost`)
    // In a real implementation this might trigger other actions (emails, notifications)

  } catch (error) {
    console.error("Error handling boost payment:", error)
  }
} 