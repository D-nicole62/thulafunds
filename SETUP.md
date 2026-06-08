# Thula Funds — Stellar-First Setup

Crowdfunding on **Stellar Soroban** smart contracts. All money flows on-chain; Supabase stores metadata only.

## Architecture

| What | Where |
|------|-------|
| Donations | `crowdfund.deposit()` Soroban contract |
| Escrow | Soroban contract balance (on-chain) |
| Payouts | `crowdfund.withdraw()` on success |
| Refunds | `crowdfund.refund()` on expired campaigns |
| Milestones | `milestone.release_milestone()` |
| Campaign metadata | Supabase (title, story, images) |
| Profiles, comments | Supabase (no money) |

Progress bars read **live balances from Soroban RPC** — Supabase `on_chain_balance` is a cache synced by the indexer.

## Prerequisites

- Node.js 18+, pnpm
- Rust + `soroban-cli` (for contract deployment)
- [Freighter](https://www.freighter.app/) wallet (primary; Albedo/xBull also supported)
- Supabase project

## 1. Install

```bash
pnpm install
pnpm exec prisma generate
```

## 2. Environment

Copy `.env.example` → `.env` and fill in:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet          # testnet for dev, public for prod
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5R43SA4Q
NEXT_PUBLIC_USDC_CONTRACT_ID=C...            # USDC SAC on Soroban
NEXT_PUBLIC_CAMPAIGN_FACTORY_ID=C...         # After deploying contracts
DATABASE_URL=...
```

## 3. Database

Run `scripts/soroban-migration.sql` in Supabase SQL editor, then:

```bash
pnpm exec prisma db push   # if DATABASE_URL is set
```

## 4. Deploy Soroban Contracts

```bash
cargo install --locked soroban-cli
pnpm contracts:build
```

See [contracts/README.md](contracts/README.md) for full deploy steps with `soroban-cli`.

## 5. Run

```bash
pnpm dev                    # Next.js app
pnpm indexer                # Sync on-chain balances → Supabase cache
```

## Wallets

- **Freighter** (primary) — `@stellar/freighter-api`
- **Albedo** — browser extension
- **xBull** — browser extension

## Assets

Only Stellar-native: **XLM** (fees) and **USDC** (Circle issuer on Stellar).

## Email

Deploy Supabase Edge Function `supabase/functions/send-email` with `RESEND_API_KEY` for donation receipts and campaign updates.

## Verify setup

```bash
pnpm setup:check
```
