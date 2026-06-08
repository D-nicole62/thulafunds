import "dotenv/config"

const checks: { name: string; ok: boolean; hint?: string }[] = []

function hasEnv(key: string, invalid?: string[]) {
  const value = process.env[key]?.trim()
  if (!value) return false
  if (invalid?.some((v) => value.includes(v))) return false
  return true
}

checks.push({
  name: "NEXT_PUBLIC_SUPABASE_URL",
  ok: hasEnv("NEXT_PUBLIC_SUPABASE_URL"),
  hint: "Set your Supabase project URL",
})

checks.push({
  name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ok: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ["your-anon-key"]),
  hint: "Set your Supabase anon key",
})

checks.push({
  name: "DATABASE_URL",
  ok: hasEnv("DATABASE_URL", ["[YOUR-DB-PASSWORD]", "[password]", "your-"]),
  hint: "Add Supabase Postgres connection string (Settings → Database)",
})

checks.push({
  name: "DIRECT_URL",
  ok: hasEnv("DIRECT_URL", ["[YOUR-DB-PASSWORD]", "[password]", "your-"]),
  hint: "Add Supabase direct Postgres connection string",
})

checks.push({
  name: "NEXT_PUBLIC_STELLAR_NETWORK",
  ok: hasEnv("NEXT_PUBLIC_STELLAR_NETWORK"),
  hint: "Set to 'public' or 'testnet'",
})

checks.push({
  name: "NEXT_PUBLIC_USDC_ISSUER",
  ok: hasEnv("NEXT_PUBLIC_USDC_ISSUER"),
  hint: "Circle USDC issuer on Stellar",
})

checks.push({
  name: "NEXT_PUBLIC_USDC_CONTRACT_ID",
  ok: hasEnv("NEXT_PUBLIC_USDC_CONTRACT_ID"),
  hint: "USDC Stellar Asset Contract (SAC) on Soroban",
})

checks.push({
  name: "NEXT_PUBLIC_CAMPAIGN_FACTORY_ID",
  ok: hasEnv("NEXT_PUBLIC_CAMPAIGN_FACTORY_ID"),
  hint: "Deployed CampaignFactory contract ID",
})

checks.push({
  name: "NEXT_PUBLIC_SOROBAN_RPC_URL",
  ok: hasEnv("NEXT_PUBLIC_SOROBAN_RPC_URL"),
  hint: "Soroban RPC endpoint",
})

checks.push({
  name: "X402_WALLET_ADDRESS",
  ok: hasEnv("X402_WALLET_ADDRESS"),
  hint: "Your Stellar public key (G...) for platform payments",
})

console.log("\nThula Funds — Setup Check\n")

let allOk = true
for (const check of checks) {
  const status = check.ok ? "OK" : "MISSING"
  console.log(`  [${status.padEnd(7)}] ${check.name}`)
  if (!check.ok && check.hint) {
    console.log(`           → ${check.hint}`)
    allOk = false
  }
}

async function checkPackages() {
  try {
    await import("@stellar/stellar-sdk")
    console.log(`  [${"OK".padEnd(7)}] @stellar/stellar-sdk`)
  } catch {
    console.log(`  [${"MISSING".padEnd(7)}] @stellar/stellar-sdk — run: pnpm install`)
    allOk = false
  }

  try {
    await import("@stellar/freighter-api")
    console.log(`  [${"OK".padEnd(7)}] @stellar/freighter-api`)
  } catch {
    console.log(`  [${"MISSING".padEnd(7)}] @stellar/freighter-api — run: pnpm install`)
    allOk = false
  }

  console.log("")
  if (allOk) {
    console.log("All checks passed. Run: pnpm dev")
  } else {
    console.log("Some checks failed. Update .env then run: pnpm setup:check")
  }
  console.log("")
}

checkPackages()
