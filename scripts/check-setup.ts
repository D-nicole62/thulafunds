import "dotenv/config"

const checks: { name: string; ok: boolean; hint?: string; optional?: boolean }[] = []

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
  name: "NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY)",
  ok:
    hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ["your-anon-key"]) ||
    hasEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    hasEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  hint: "Set your Supabase anon or publishable key",
})

checks.push({
  name: "SUPABASE_SERVICE_ROLE_KEY",
  ok: hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
  hint: "Server-side DB access — Supabase Dashboard → Settings → API → service_role",
})

checks.push({
  name: "NEXT_PUBLIC_APP_URL",
  ok: hasEnv("NEXT_PUBLIC_APP_URL"),
  hint: "Production site URL for auth redirects — e.g. https://www.thulafunds.com",
  optional: process.env.NODE_ENV !== "production",
})

checks.push({
  name: "NEXT_PUBLIC_STELLAR_NETWORK",
  ok: hasEnv("NEXT_PUBLIC_STELLAR_NETWORK"),
  hint: "Set to 'public' or 'testnet'",
})

checks.push({
  name: "NEXT_PUBLIC_USDC_ISSUER",
  ok:
    hasEnv("NEXT_PUBLIC_USDC_ISSUER") ||
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "testnet",
  hint: "Set USDC issuer (testnet default: GBBD47IF6...)",
})

checks.push({
  name: "NEXT_PUBLIC_USDC_CONTRACT_ID",
  ok:
    hasEnv("NEXT_PUBLIC_USDC_CONTRACT_ID") ||
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "testnet",
  hint: "USDC SAC on Soroban (testnet default: CBIELTK6...)",
})

checks.push({
  name: "NEXT_PUBLIC_CAMPAIGN_FACTORY_ID",
  ok: hasEnv("NEXT_PUBLIC_CAMPAIGN_FACTORY_ID"),
  hint: "Optional — deploy factory (contracts/README.md) to enable Soroban escrow",
  optional: true,
})

checks.push({
  name: "NEXT_PUBLIC_SOROBAN_RPC_URL",
  ok: hasEnv("NEXT_PUBLIC_SOROBAN_RPC_URL"),
  hint: "Soroban RPC endpoint",
})

checks.push({
  name: "X402_WALLET_ADDRESS",
  ok: hasEnv("X402_WALLET_ADDRESS") || hasEnv("NEXT_PUBLIC_X402_WALLET_ADDRESS"),
  hint: "Optional — your Stellar G... address for boost/analytics fees",
  optional: true,
})

console.log("\nThula Funds — Setup Check\n")

let allOk = true
for (const check of checks) {
  const status = check.ok ? "OK" : check.optional ? "OPTIONAL" : "MISSING"
  console.log(`  [${status.padEnd(7)}] ${check.name}`)
  if (!check.ok && check.hint) {
    console.log(`           → ${check.hint}`)
    if (!check.optional) allOk = false
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
