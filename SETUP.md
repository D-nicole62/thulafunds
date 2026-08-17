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
pnpm setup:check
pnpm db:test
```

## 2. Environment

Copy `.env.example` → `.env` and fill in:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet          # testnet for dev, public for prod
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5R43SA4Q
NEXT_PUBLIC_USDC_CONTRACT_ID=C...            # USDC SAC on Soroban
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Server only — Settings → API
NEXT_PUBLIC_APP_URL=https://thulafunds.com   # Production site URL for auth email links
NEXT_PUBLIC_PRODUCTION_URL=https://thulafunds.com   # Auth callbacks always use this in production
NEXT_PUBLIC_CAMPAIGN_FACTORY_ID=C...         # After deploying contracts
```

## 3. Database

Run `scripts/soroban-migration.sql` in Supabase SQL Editor (creates tables + RLS). Then verify:

```bash
pnpm db:test
```

### Lipila donations (“Failed to record donation”)

If mobile money or card payments succeed in Lipila but the site shows **Failed to record donation**, run **`scripts/fix-donations-schema.sql`** in the Supabase SQL Editor. It:

- Renames `contributions` → `donations` if needed
- Adds `tx_hash`, `payment_method`, `status`, `currency`
- Fixes the `update_campaign_amount()` trigger (legacy trigger still queried `contributions`, which breaks inserts)
- Sets a UUID default on `donations.id`

Then verify:

```bash
pnpm db:donations
```

Ensure Vercel production env includes:

```bash
LIPILA_API_KEY=...
LIPILA_API_BASE=https://blz.lipila.io
NEXT_PUBLIC_LIPILA_CURRENCY=ZMW
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

### Auth emails (signup verification)

Supabase’s **built-in email service** allows only a few auth emails per hour. If users see **“email rate limit exceeded”** on signup, configure **custom SMTP** in Supabase:

1. Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**
2. Enable custom SMTP and use [Resend SMTP](https://resend.com/docs/send-with-smtp):
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** your `RESEND_API_KEY`
   - **Sender email:** a verified address (e.g. `noreply@thulafunds.com`)
3. Authentication → **URL Configuration**:
   - **Site URL:** `https://thulafunds.com` (must not be `localhost` in production)
   - **Redirect URLs:** add all of:
     - `https://thulafunds.com/auth/callback`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3001/auth/callback`
4. Set `NEXT_PUBLIC_APP_URL=https://thulafunds.com` in Vercel and redeploy
5. Save and redeploy if env vars changed

If an old verification email still opens `localhost`, use **Resend verification email** on the verify page — links from before this fix may still point to localhost.

Until SMTP is configured, wait ~1 hour after hitting the limit before retrying signup or resend.

## Verify setup

```bash
pnpm setup:check
```
