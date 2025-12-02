-- Add site_name column to distinguish between different sites
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS site_name text NULL DEFAULT 'topicmingle';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS site_name text NULL DEFAULT 'topicmingle';
ALTER TABLE public.web_results ADD COLUMN IF NOT EXISTS site_name text NULL DEFAULT 'topicmingle';
ALTER TABLE public.related_searches ADD COLUMN IF NOT EXISTS site_name text NULL DEFAULT 'topicmingle';
ALTER TABLE public.pre_landing_pages ADD COLUMN IF NOT EXISTS site_name text NULL DEFAULT 'topicmingle';

-- Create indexes for efficient filtering by site_name
CREATE INDEX IF NOT EXISTS idx_blogs_site_name ON public.blogs USING btree (site_name);
CREATE INDEX IF NOT EXISTS idx_categories_site_name ON public.categories USING btree (site_name);
CREATE INDEX IF NOT EXISTS idx_web_results_site_name ON public.web_results USING btree (site_name);
CREATE INDEX IF NOT EXISTS idx_related_searches_site_name ON public.related_searches USING btree (site_name);
CREATE INDEX IF NOT EXISTS idx_pre_landing_pages_site_name ON public.pre_landing_pages USING btree (site_name);