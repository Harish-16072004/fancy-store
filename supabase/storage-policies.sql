-- ============================================
-- Supabase Storage Setup
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- ============================================

-- Create the 'photos' storage bucket (public = true for URL-based image display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to the photos bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow authenticated users to view/read files
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos');

-- Allow authenticated users to update (overwrite) files
CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos');

-- Allow public read access (since bucket is public, anyone with URL can view)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'photos');
