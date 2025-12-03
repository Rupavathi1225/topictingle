-- Allow anyone to insert related searches (admin use case)
CREATE POLICY "Anyone can insert related searches" 
ON public.related_searches 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update related searches
CREATE POLICY "Anyone can update related searches" 
ON public.related_searches 
FOR UPDATE 
USING (true);

-- Allow anyone to delete related searches
CREATE POLICY "Anyone can delete related searches" 
ON public.related_searches 
FOR DELETE 
USING (true);

-- Update SELECT policy to allow viewing all (not just active) for admin
DROP POLICY IF EXISTS "Anyone can view active related searches" ON public.related_searches;
CREATE POLICY "Anyone can view all related searches" 
ON public.related_searches 
FOR SELECT 
USING (true);