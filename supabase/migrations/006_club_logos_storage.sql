-- Migration: 006_club_logos_storage.sql
-- Description: Public storage bucket and RLS policies for club logos

INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Club logos are publicly accessible" ON storage.objects;
CREATE POLICY "Club logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "Authenticated users can upload club logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload club logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update club logos" ON storage.objects;
CREATE POLICY "Authenticated users can update club logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');
