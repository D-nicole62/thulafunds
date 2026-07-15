# Thula Funds Soroban Contracts

On-chain escrow for crowdfunding on Stellar. Deploy with [Stellar CLI](https://developers.stellar.org/docs/tools/cli) (formerly soroban-cli).

## Contracts

| Contract | Purpose |
|----------|---------|
| `crowdfund` | Per-campaign escrow — `deposit()`, `withdraw()`, `refund()`, `balance()` |
| `campaign_factory` | Deploys a new crowdfund WASM instance per campaign |
| `milestone` | Milestone-gated `release_milestone()` payouts from escrow |

## Prerequisites

1. **Rust** + `wasm32v1-none` target: `rustup target add wasm32v1-none`
2. **Stellar CLI**: `cargo install --locked stellar-cli --features opt`
3. **Funded testnet account** (Freighter): get XLM from [Stellar Laboratory faucet](https://laboratory.stellar.org/#account-creator?network=test)
4. **Testnet USDC** in your wallet for donations (issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`)

## Quick deploy (recommended)

From the project root:

```bash
pnpm contracts:build    # compile WASM
pnpm contracts:deploy   # upload + deploy to testnet, updates .env
```

## Build

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

WASM output:

- `crowdfund/target/wasm32v1-none/release/crowdfund.wasm`
- `campaign_factory/target/wasm32v1-none/release/campaign_factory.wasm`
- `milestone/target/wasm32v1-none/release/milestone.wasm`

## Deploy (Testnet)

Replace `GADMIN...` with your Freighter public key (must hold testnet XLM).

```bash
# Configure testnet (Stellar CLI v23+)
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Fund and configure identity
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet

# Build contract WASM
cd contracts/crowdfund && stellar contract build
cd ../campaign_factory && stellar contract build
cd ../milestone && stellar contract build
cd ..

# Install crowdfund WASM (returns WASM hash)
CROWDFUND_WASM_HASH=$(stellar contract install \
  --wasm crowdfund/target/wasm32v1-none/release/crowdfund.wasm \
  --source admin \
  --network testnet)

# Deploy factory
FACTORY_ID=$(stellar contract deploy \
  --wasm campaign_factory/target/wasm32v1-none/release/campaign_factory.wasm \
  --source admin \
  --network testnet)

echo "Factory ID: $FACTORY_ID"

# Initialize factory
stellar contract invoke \
  --id $FACTORY_ID \
  --source admin \
  --network testnet \
  -- initialize --admin GADMIN... --wasm_hash $CROWDFUND_WASM_HASH

# Optional: deploy milestone contract
MILESTONE_ID=$(stellar contract deploy \
  --wasm milestone/target/wasm32v1-none/release/milestone.wasm \
  --source admin \
  --network testnet)
```

## Environment variables

Add to `.env` and Vercel project settings:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Testnet USDC (defaults apply if omitted on testnet)
NEXT_PUBLIC_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
NEXT_PUBLIC_USDC_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

# From deploy steps above
NEXT_PUBLIC_CAMPAIGN_FACTORY_ID=C...
NEXT_PUBLIC_MILESTONE_CONTRACT_ID=C...

# Platform wallet for boost/analytics fees (your G... address)
NEXT_PUBLIC_X402_WALLET_ADDRESS=G...
X402_WALLET_ADDRESS=G...
```

After `NEXT_PUBLIC_CAMPAIGN_FACTORY_ID` is set, creating a campaign in the app will:

1. Save the campaign in Supabase
2. Prompt the organizer to sign a factory `create_campaign` transaction
3. Register the deployed escrow contract via `POST /api/campaigns/[id]/contract`

Without the factory ID, campaigns still work with **direct USDC wallet donations** and Lipila fiat payments.

## Known testnet contract IDs

| Asset | Contract / Issuer |
|-------|-------------------|
| USDC SAC | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| USDC issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

## Financial flows

- **Donate (escrow)** → `crowdfund.deposit(donor, amount)` — USDC held in contract escrow
- **Donate (no escrow)** → direct USDC payment to organizer wallet (fallback)
- **Success payout** → `crowdfund.withdraw()` — organizer receives escrow when goal met
- **Expired refund** → `crowdfund.refund(donor)` — donors reclaim if goal not met
- **Milestone** → `milestone.release_milestone(index)` — partial release from escrow

All txs produce a Stellar transaction hash verifiable on [Stellar Expert (testnet)](https://stellar.expert/explorer/testnet).
