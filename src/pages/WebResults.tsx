import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTracking } from '@/hooks/useTracking';
import { GoogleStyleWebResult } from '@/components/GoogleStyleWebResult';

interface WebResult {
  id: string;
  title: string;
  description?: string;
  logo_url?: string;
  target_url: string;
  page_number: number;
  position: number;
  is_active: boolean;
  is_sponsored?: boolean;
  pre_landing_page_key?: string;
}

export const WebResults = () => {
  const [searchParams] = useSearchParams();
  const pageNumber = parseInt(searchParams.get('wr') || '1');
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [sponsoredResults, setSponsoredResults] = useState<WebResult[]>([]);
  const { sessionId } = useTracking();

  useEffect(() => {
    fetchWebResults();
  }, [pageNumber]);

  const fetchWebResults = async () => {
    const { data } = await supabase
      .from('web_results')
      .select('*')
      .eq('page_number', pageNumber)
      .eq('is_active', true)
      .order('position', { ascending: true });
    
    if (data) {
      const sponsored = data.filter(r => r.is_sponsored);
      const organic = data.filter(r => !r.is_sponsored);
      setSponsoredResults(sponsored);
      setWebResults(organic);
    }
  };

  const handleResultClick = (result: WebResult) => {
    if (result.pre_landing_page_key) {
      window.location.href = `/prelanding?page=${result.pre_landing_page_key}`;
    } else {
      window.location.href = result.target_url;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm mb-6">
          ← Back to Home
        </Link>

        {/* Sponsored Results */}
        {sponsoredResults.length > 0 && (
          <div className="mb-6">
            {sponsoredResults.map((result) => (
              <GoogleStyleWebResult
                key={result.id}
                title={result.title}
                description={result.description}
                logoUrl={result.logo_url}
                targetUrl={result.target_url}
                isSponsored={true}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>
        )}

        {/* Organic Web Results */}
        <div className="divide-y divide-border/50">
          {webResults.map((result) => (
            <GoogleStyleWebResult
              key={result.id}
              title={result.title}
              description={result.description}
              logoUrl={result.logo_url}
              targetUrl={result.target_url}
              onClick={() => handleResultClick(result)}
            />
          ))}
        </div>

        {webResults.length === 0 && sponsoredResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found for this page.
          </div>
        )}
      </div>
    </div>
  );
};
