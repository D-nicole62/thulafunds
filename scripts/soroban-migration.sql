-- Stellar-first Soroban architecture migration
-- Run in Supabase SQL editor

-- Rename contributions → donations (if upgrading existing DB)
ALTER TABLE IF EXISTS contributions RENAME TO donations;

-- Add on-chain fields to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS contract_address TEXT,
  ADD COLUMN IF NOT EXISTS milestone_contract_address TEXT,
  ADD COLUMN IF NOT EXISTS on_chain_balance DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Ensure donations table has tx_hash (required for every financial action)
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS tx_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS donations_tx_hash_idx ON donations(tx_hash);

-- Milestones for milestone contract releases
CREATE TABLE IF NOT EXISTS milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  release_tx_hash TEXT,
  released_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS milestones_campaign_id_idx ON milestones(campaign_id);
