import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nowIso } from "@/lib/db/helpers"

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

    const db = createAdminClient()
    const { data: campaign, error: fetchError } = await db.from("campaigns").select("*").eq("id", id).maybeSingle()

    if (fetchError || !campaign || campaign.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 403 })
    }

    const { data: updated, error: updateError } = await db
      .from("campaigns")
      .update({
        contract_address,
        deadline: deadline ? new Date(deadline).toISOString() : campaign.deadline,
        payment_method: "soroban_escrow",
        updated_at: nowIso(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    if (deploy_tx_hash) {
      await db.from("payment_sessions").upsert(
        {
          tx_hash: deploy_tx_hash,
          endpoint: `/api/campaigns/${id}/contract`,
          status: "completed",
          amount: 0,
          from_address: campaign.wallet_address,
        },
        { onConflict: "tx_hash" },
      )
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
