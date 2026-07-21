import { createAdminClient } from "@/lib/supabase/admin"
import { asNumber } from "@/lib/db/helpers"

interface PaymentVerificationResult {
  verified: boolean
  error?: string
  status?: number
  proof?: {
    verified: boolean
    txHash: string
    amount: number | string
    timestamp: string
  }
}

interface PaymentRouteConfig {
  price: number
  description: string
}

export async function verifyPaymentSession(
  headers: Headers,
  routeConfig: PaymentRouteConfig,
): Promise<PaymentVerificationResult> {
  const paymentSession = headers.get("x-payment-session")
  const authHeader = headers.get("authorization")

  if (!paymentSession && !authHeader) {
    return {
      verified: false,
      error: "Payment Required",
      status: 402,
    }
  }

  if (paymentSession) {
    try {
      const session = JSON.parse(paymentSession)
      const { txHash, endpoint } = session

      const db = createAdminClient()
      const { data: verifiedSession } = await db
        .from("payment_sessions")
        .select("*")
        .eq("tx_hash", txHash)
        .eq("endpoint", endpoint)
        .eq("status", "completed")
        .maybeSingle()

      if (!verifiedSession) {
        return { verified: false, error: "Invalid payment session", status: 402 }
      }

      if (asNumber(verifiedSession.amount) < routeConfig.price) {
        return { verified: false, error: "Insufficient payment amount", status: 402 }
      }

      const paymentAge = Date.now() - new Date(verifiedSession.created_at).getTime()
      const maxAge = 24 * 60 * 60 * 1000

      if (paymentAge > maxAge) {
        return { verified: false, error: "Payment session expired", status: 402 }
      }

      return {
        verified: true,
        proof: {
          verified: true,
          txHash,
          amount: verifiedSession.amount,
          timestamp: verifiedSession.created_at,
        },
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      return { verified: false, error: "Invalid payment session format", status: 402 }
    }
  }

  return { verified: true }
}
