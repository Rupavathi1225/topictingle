-- Update the default category_id to an existing category (Home = 8)
ALTER TABLE public.related_searches ALTER COLUMN category_id SET DEFAULT 8;