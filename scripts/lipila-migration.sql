-- Lipila fiat payments support
-- Run in Supabase SQL editor (after soroban-migration.sql)

-- Distinguish on-chain (soroban_escrow) vs fiat (lipila) donations,
-- track payment status, and record the currency collected.
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'soroban_escrow',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USDC';

CREATE INDEX IF NOT EXISTS donations_payment_method_idx ON donations(payment_method);
