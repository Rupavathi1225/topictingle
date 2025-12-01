-- Add blog_id to related_searches table for TopicMingle
ALTER TABLE public.related_searches 
ADD COLUMN IF NOT EXISTS blog_id UUID;

-- Add foreign key for related_searches.blog_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'related_searches_blog_id_fkey'
  ) THEN
    ALTER TABLE public.related_searches
    ADD CONSTRAINT related_searches_blog_id_fkey 
    FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update web_results to link to related_searches instead of blogs
ALTER TABLE public.web_results
ADD COLUMN IF NOT EXISTS related_search_id UUID;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'web_results_related_search_id_fkey'
  ) THEN
    ALTER TABLE public.web_results
    ADD CONSTRAINT web_results_related_search_id_fkey
    FOREIGN KEY (related_search_id) REFERENCES public.related_searches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_related_searches_blog_id ON public.related_searches(blog_id);
CREATE INDEX IF NOT EXISTS idx_dz_related_searches_blog_id ON public.dz_related_searches(blog_id);
CREATE INDEX IF NOT EXISTS idx_web_results_related_search_id ON public.web_results(related_search_id);