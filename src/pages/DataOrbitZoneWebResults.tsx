import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { dataOrbitZoneClient } from '@/integrations/dataorbitzone/client';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  position: number;
  pre_landing_page_key: string | null;
}

export const DataOrbitZoneWebResults = () => {
  const [searchParams] = useSearchParams();
  const pageNumber = parseInt(searchParams.get('wr') || '1');
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [sponsoredResults, setSponsoredResults] = useState<WebResult[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [userCountry, setUserCountry] = useState<string>('WW');

  useEffect(() => {
    const getUserCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setUserCountry(data.country_code || 'WW');
      } catch {
        setUserCountry('WW');
      }
    };
    getUserCountry();
  }, []);

  useEffect(() => {
    fetchWebResults();
    fetchRelatedSearches();
  }, [pageNumber]);

  const fetchWebResults = async () => {
    const { data } = await dataOrbitZoneClient
      .from('web_results')
      .select('*')
      .eq('page_number', pageNumber)
      .order('position', { ascending: true });
    
    if (data) {
      const sponsored = data.filter(r => r.is_sponsored);
      const organic = data.filter(r => !r.is_sponsored);
      setSponsoredResults(sponsored);
      setWebResults(organic);
    }
  };

  const fetchRelatedSearches = async () => {
    const { data } = await dataOrbitZoneClient
      .from('related_searches')
      .select('*')
      .eq('web_result_page', pageNumber)
      .order('position', { ascending: true });
    
    if (data) {
      const limited = data.slice(0, 4);
      setRelatedSearches(limited as any);
    }
  };
  const handleResultClick = (result: WebResult) => {
    if (result.pre_landing_page_key) {
      window.location.href = `/dataorbit/prelanding?page=${result.pre_landing_page_key}`;
    } else {
      window.location.href = result.target_url;
    }
  };

  const handleSearchClick = (search: RelatedSearch) => {
    if (search.pre_landing_page_key) {
      window.location.href = `/dataorbit/prelanding?page=${search.pre_landing_page_key}`;
    } else {
      // Redirect to the web result page specified in the search
      window.location.href = `/dataorbit/wr?wr=${search.web_result_page}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/dataorbit" className="inline-flex items-center text-accent hover:underline mb-6">
          ← Back to DataOrbitZone
        </Link>

        {sponsoredResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Sponsored Results</h2>
            <div className="space-y-4">
              {sponsoredResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="bg-card border border-accent/20 rounded-lg p-6 hover:border-accent/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    {result.logo_url && (
                      <div className="flex-shrink-0">
                        <img 
                          src={result.logo_url} 
                          alt={result.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                          Ad · Sponsored
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground hover:text-accent transition-colors">
                        {result.title}
                      </h3>
                      {result.description && (
                        <p className="text-muted-foreground mb-2">
                          {result.description}
                        </p>
                      )}
                      <p className="text-sm text-accent break-all">
                        {new URL(result.target_url).hostname}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Web Results</h2>
          <div className="space-y-6">
            {webResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="bg-card border rounded-lg p-6 hover:border-accent/40 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {result.logo_url ? (
                    <div className="flex-shrink-0">
                      <img 
                        src={result.logo_url} 
                        alt={result.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent font-bold text-lg">
                        {result.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1 text-foreground hover:text-accent transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {new URL(result.target_url).hostname}
                    </p>
                    {result.description && (
                      <p className="text-muted-foreground">
                        {result.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {relatedSearches.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold mb-4">Related Searches</h3>
            <div className="grid gap-3">
              {relatedSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="flex items-center justify-between p-4 bg-card hover:bg-accent/10 text-foreground rounded-lg transition-colors duration-200 group border"
                >
                  <span className="text-left font-medium">{search.title || search.search_text}</span>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
