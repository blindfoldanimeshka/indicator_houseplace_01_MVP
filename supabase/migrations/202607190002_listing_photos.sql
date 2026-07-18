-- Phase 5: listing photos (secure storage + metadata table).
-- Applied to Supabase project MVP-House.

-- 1. Metadata table for listing photos.
CREATE TABLE IF NOT EXISTS public.listing_images (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  size_bytes integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_images_path_not_empty CHECK (char_length(btrim(path)) > 0),
  CONSTRAINT listing_images_mime_allowed CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);

CREATE INDEX listing_images_listing_idx ON public.listing_images (listing_id, sort_order);

-- 2. Storage bucket (public read; writes controlled by RLS policies below).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage RLS: only the listing author may upload/delete/select their files.
-- Path pattern: listing/{listing_id}/{uuid}.webp
-- We verify ownership by joining the path's listing_id to public.listings.

CREATE OR REPLACE FUNCTION private.listing_id_from_path(p_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (string_to_array(p_path, '/'))[2]::uuid
$$;

CREATE OR REPLACE FUNCTION private.is_listing_author(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id
      AND listing.author_id = (SELECT auth.uid())
  )
$$;

-- Select (read) objects: public bucket already allows anon GET via URL;
-- restrict the Storage API list/select to the author of the listing.
CREATE POLICY "Authors read their listing photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (SELECT private.is_listing_author((SELECT private.listing_id_from_path(name))))
  );

-- Insert (upload): only authenticated authors of the referenced listing.
CREATE POLICY "Authors upload their listing photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (SELECT private.is_listing_author((SELECT private.listing_id_from_path(name))))
  );

-- Delete: only the author of the listing.
CREATE POLICY "Authors delete their listing photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (SELECT private.is_listing_author((SELECT private.listing_id_from_path(name))))
  );

-- 4. RLS on the metadata table.
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.listing_images FROM anon, authenticated;
GRANT SELECT ON public.listing_images TO anon, authenticated;
GRANT INSERT, DELETE ON public.listing_images TO authenticated;

CREATE POLICY "Public reads listing images"
  ON public.listing_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authors insert their listing images"
  ON public.listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings AS listing
      WHERE listing.id = listing_id
        AND listing.author_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authors delete their listing images"
  ON public.listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings AS listing
      WHERE listing.id = listing_id
        AND listing.author_id = (SELECT auth.uid())
    )
  );
