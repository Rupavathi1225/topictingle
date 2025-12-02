-- Create dz_web_results table for DataOrbitZone web results
CREATE TABLE IF NOT EXISTS public.dz_web_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  related_search_id UUID REFERENCES public.dz_related_searches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  target_url TEXT NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sponsored BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dz_web_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active web results" 
ON public.dz_web_results 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Service role can manage web results" 
ON public.dz_web_results 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_dz_web_results_updated_at
BEFORE UPDATE ON public.dz_web_results
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();