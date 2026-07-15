/**
 * Prints Soroban deployment checklist and env template.
 * Run: pnpm contracts:deploy-help
 *
 * Actual deployment requires stellar-cli on a funded testnet account.
 * See contracts/README.md for full commands.
 */
import "dotenv/config"
import { isSorobanEscrowConfigured } from "../lib/stellar/config"

console.log("\nThula Funds — Soroban Deploy Helper\n")
console.log("Escrow configured:", isSorobanEscrowConfigured() ? "yes" : "no")
console.log("")
console.log("Required steps (testnet):")
console.log("  1. cargo install --locked stellar-cli --features opt")
console.log("  2. stellar keys generate admin --network testnet && stellar keys fund admin")
console.log("  3. cd contracts && cargo build --target wasm32v1-none --release")
console.log("  4. Follow contracts/README.md to install crowdfund WASM and deploy factory")
console.log("")
console.log("Add to .env after deploy:")
console.log("  NEXT_PUBLIC_CAMPAIGN_FACTORY_ID=C...")
console.log("  NEXT_PUBLIC_X402_WALLET_ADDRESS=G...  (your platform wallet)")
console.log("")
console.log("USDC testnet SAC (auto-default on testnet):")
console.log("  CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA")
console.log("")
