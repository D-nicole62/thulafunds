import { type NextRequest, NextResponse } from "next/server"
import { fetchAccountBalances, fundTestnetAccount } from "@/lib/stellar/account"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")
  if (!address) {
    return NextResponse.json({ error: "address query param required" }, { status: 400 })
  }

  const normalized = normalizeStellarAddress(address)
  if (!isValidStellarAddress(normalized)) {
    return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 })
  }

  try {
    const balances = await fetchAccountBalances(normalized)
    return NextResponse.json({ address: normalized, ...balances })
  } catch (error) {
    console.error("Account lookup failed:", error)
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    if (!address || !isValidStellarAddress(normalizeStellarAddress(address))) {
      return NextResponse.json({ error: "Valid Stellar address required" }, { status: 400 })
    }

    await fundTestnetAccount(normalizeStellarAddress(address))
    const balances = await fetchAccountBalances(normalizeStellarAddress(address))
    return NextResponse.json({
      success: true,
      address: normalizeStellarAddress(address),
      ...balances,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Funding failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
