-- Fix campaigns.id when the column has no default UUID generator.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE campaigns
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Optional: backfill any rows that were created with null id attempts (should be none if PK enforced)
-- UPDATE campaigns SET id = gen_random_uuid() WHERE id IS NULL;
