import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Register Soroban contract address after factory deployment */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { contract_address, deploy_tx_hash, deadline } = await request.json()

    if (!contract_address) {
      return NextResponse.json({ error: "contract_address required" }, { status: 400 })
    }

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await prisma.campaign.findUnique({ where: { id } })
    if (!campaign || campaign.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 403 })
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        contract_address,
        deadline: deadline ? new Date(deadline) : campaign.deadline,
        payment_method: "soroban_escrow",
        updated_at: new Date(),
      },
    })

    if (deploy_tx_hash) {
      await prisma.paymentSession.upsert({
        where: { tx_hash: deploy_tx_hash },
        create: {
          tx_hash: deploy_tx_hash,
          endpoint: `/api/campaigns/${id}/contract`,
          status: "completed",
          amount: 0,
          from_address: campaign.wallet_address,
        },
        update: { status: "completed" },
      })
    }

    return NextResponse.json({
      success: true,
      contract_address: updated.contract_address,
    })
  } catch (error) {
    console.error("Contract registration error:", error)
    return NextResponse.json({ error: "Failed to register contract" }, { status: 500 })
  }
}
