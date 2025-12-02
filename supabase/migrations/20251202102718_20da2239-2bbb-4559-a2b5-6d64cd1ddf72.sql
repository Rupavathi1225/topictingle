-- Add missing author_bio and author_image columns to blogs for DataOrbitZone support
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS author_bio text NULL,
  ADD COLUMN IF NOT EXISTS author_image text NULL;
