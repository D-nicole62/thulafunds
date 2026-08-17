-- Fix donations table for Lipila + Soroban recording
-- Run in Supabase Dashboard → SQL Editor

-- 1. Rename legacy table if migrations were never run
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contributions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'donations'
  ) THEN
    ALTER TABLE contributions RENAME TO donations;
  END IF;
END $$;

-- 2. Ensure tx_hash exists (migrate from transaction_hash if present)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS tx_hash TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'donations' AND column_name = 'transaction_hash'
  ) THEN
    UPDATE donations SET tx_hash = transaction_hash WHERE tx_hash IS NULL AND transaction_hash IS NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS donations_tx_hash_idx ON donations(tx_hash) WHERE tx_hash IS NOT NULL;

-- 3. Lipila / payment metadata columns
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'soroban_escrow',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USDC';

CREATE INDEX IF NOT EXISTS donations_payment_method_idx ON donations(payment_method);

-- 4. UUID default for id (same issue as campaigns)
ALTER TABLE donations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Fix trigger that still sums from `contributions` after table rename
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM donations
    WHERE campaign_id = NEW.campaign_id
  ),
  updated_at = NOW()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contribution_created ON donations;
DROP TRIGGER IF EXISTS on_donation_created ON donations;

CREATE TRIGGER on_donation_created
  AFTER INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION update_campaign_amount();

-- 6. RLS policies on donations (rename from contributions if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contributions'
  ) THEN
    -- Policies follow table rename automatically in Postgres; recreate for clarity
    NULL;
  END IF;
END $$;

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view contributions" ON donations;
DROP POLICY IF EXISTS "Users can create contributions" ON donations;
DROP POLICY IF EXISTS "Anyone can view donations" ON donations;
DROP POLICY IF EXISTS "Users can create donations" ON donations;

CREATE POLICY "Anyone can view donations" ON donations FOR SELECT USING (true);
CREATE POLICY "Users can create donations" ON donations FOR INSERT WITH CHECK (
  auth.uid() = contributor_id OR contributor_id IS NULL
);

-- 7. Backfill campaign totals for lipila / non-escrow campaigns
UPDATE campaigns c
SET
  current_amount = COALESCE((
    SELECT SUM(d.amount)
    FROM donations d
    WHERE d.campaign_id = c.id
      AND (d.status IS NULL OR d.status = 'completed')
  ), 0),
  updated_at = NOW()
WHERE c.contract_address IS NULL;
