# Thula Funds Soroban Contracts

On-chain escrow for crowdfunding on Stellar. Deploy with [soroban-cli](https://soroban.stellar.org/docs/getting-started/setup).

## Contracts

| Contract | Purpose |
|----------|---------|
| `crowdfund` | Per-campaign escrow — `deposit()`, `withdraw()`, `refund()`, `balance()` |
| `campaign_factory` | Deploys a new crowdfund WASM instance per campaign |
| `milestone` | Milestone-gated `release_milestone()` payouts from escrow |

## Build

```bash
# Install soroban-cli (once)
cargo install --locked soroban-cli

# Build all WASM artifacts
cd contracts
cargo build --target wasm32v1-none --release
```

WASM output:
- `crowdfund/target/wasm32v1-none/release/crowdfund.wasm`
- `campaign_factory/target/wasm32v1-none/release/campaign_factory.wasm`
- `milestone/target/wasm32v1-none/release/milestone.wasm`

## Deploy (Testnet)

```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Deploy crowdfund WASM and capture hash
soroban contract build --package crowdfund
CROWDFUND_WASM_HASH=$(soroban contract install --wasm crowdfund/target/wasm32v1-none/release/crowdfund.wasm --network testnet)

# Deploy factory
soroban contract build --package campaign_factory
soroban contract deploy \
  --wasm campaign_factory/target/wasm32v1-none/release/campaign_factory.wasm \
  --network testnet

# Initialize factory with admin + crowdfund wasm hash
soroban contract invoke \
  --id <FACTORY_ID> \
  --network testnet \
  -- initialize --admin <ADMIN_G...> --wasm_hash $CROWDFUND_WASM_HASH
```

Set deployed IDs in `.env`:

```bash
NEXT_PUBLIC_CAMPAIGN_FACTORY_ID=C...
NEXT_PUBLIC_CROWDFUND_WASM_HASH=...
NEXT_PUBLIC_USDC_CONTRACT_ID=C...   # USDC SAC on Soroban
```

## Financial flows

- **Donate** → `crowdfund.deposit(donor, amount)` — USDC held in contract escrow
- **Success payout** → `crowdfund.withdraw()` — organizer receives escrow when goal met
- **Expired refund** → `crowdfund.refund(donor)` — donors reclaim if goal not met
- **Milestone** → `milestone.release_milestone(index)` — partial release from escrow

All txs produce a Stellar transaction hash verifiable on [Stellar Expert](https://stellar.expert).
