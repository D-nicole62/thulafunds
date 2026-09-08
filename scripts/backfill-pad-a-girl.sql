-- Pad A Girl: reconcile Lipila wallet total (K107) with recorded donations (K1)
-- Run in Supabase Dashboard → SQL Editor AFTER scripts/fix-donations-schema.sql

-- Campaign: Pad A Girl
-- id: 31cfdcbd-0eb4-4a4c-a2b8-2a0a40c6715a

INSERT INTO donations (
  id,
  campaign_id,
  contributor_id,
  amount,
  message,
  anonymous,
  tx_hash,
  payment_method,
  status,
  currency,
  created_at
)
VALUES (
  gen_random_uuid(),
  '31cfdcbd-0eb4-4a4c-a2b8-2a0a40c6715a',
  NULL,
  106,
  'Historical Lipila donations reconciled to Lipila wallet total (K107)',
  true,
  'lipila-reconcile-pad-a-girl-20260308',
  'lipila',
  'completed',
  'ZMW',
  NOW()
)
ON CONFLICT (tx_hash) DO NOTHING;

UPDATE campaigns
SET
  current_amount = COALESCE((
    SELECT SUM(d.amount)
    FROM donations d
    WHERE d.campaign_id = '31cfdcbd-0eb4-4a4c-a2b8-2a0a40c6715a'
      AND (d.status IS NULL OR d.status = 'completed')
  ), 0),
  updated_at = NOW()
WHERE id = '31cfdcbd-0eb4-4a4c-a2b8-2a0a40c6715a';
