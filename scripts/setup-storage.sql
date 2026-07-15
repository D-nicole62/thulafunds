-- Supabase Storage bucket for campaign images
-- Run in Supabase Dashboard → SQL Editor, or: pnpm setup:storage

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaigns',
  'campaigns',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for campaign images
DROP POLICY IF EXISTS "Campaign images are publicly accessible" ON storage.objects;
CREATE POLICY "Campaign images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaigns');

-- Authenticated users can upload campaign images
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;
CREATE POLICY "Authenticated users can upload campaign images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaigns');

-- Users can update their own uploads (optional, for replacements)
DROP POLICY IF EXISTS "Authenticated users can update campaign images" ON storage.objects;
CREATE POLICY "Authenticated users can update campaign images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campaigns')
WITH CHECK (bucket_id = 'campaigns');

-- Users can delete their own uploads
DROP POLICY IF EXISTS "Authenticated users can delete campaign images" ON storage.objects;
CREATE POLICY "Authenticated users can delete campaign images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaigns');
