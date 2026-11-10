-- ============================================
-- Supabase Storage Setup (Hardened & Private)
-- Ariya Thangam Fancy Store
-- ============================================

-- 1. Create or update the 'photos' storage bucket to private with 5 MB limit and strict image MIME allowlist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Drop old permissive and public policies
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- 3. Enforce active staff authentication on storage operations
CREATE POLICY "Active staff can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND public.is_active_staff()
  AND (storage.foldername(name))[1] IN ('inventory', 'rentals')
);

CREATE POLICY "Active staff can view photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'photos'
  AND public.is_active_staff()
);

CREATE POLICY "Active staff can delete photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photos'
  AND public.is_active_staff()
);
