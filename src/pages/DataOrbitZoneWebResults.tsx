import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { dataOrbitZoneClient } from '@/integrations/dataorbitzone/client';
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
  related_search_id?: string | null;
}

export const DataOrbitZoneWebResults = () => {
  const [searchParams] = useSearchParams();
  const pageNumber = parseInt(searchParams.get('wr') || '1');
  const relatedSearchId = searchParams.get('rs');
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [sponsoredResults, setSponsoredResults] = useState<WebResult[]>([]);
  const [searchTitle, setSearchTitle] = useState<string>('');

  useEffect(() => {
    fetchWebResults();
    if (relatedSearchId) {
      fetchSearchTitle();
    }
  }, [pageNumber, relatedSearchId]);

  const fetchSearchTitle = async () => {
    if (!relatedSearchId) return;
    const { data } = await dataOrbitZoneClient
      .from('dz_related_searches')
      .select('search_text')
      .eq('id', relatedSearchId)
      .single();
    if (data) {
      setSearchTitle(data.search_text);
    }
  };

  const fetchWebResults = async () => {
    let query = dataOrbitZoneClient
      .from('dz_web_results')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (relatedSearchId) {
      query = query.eq('related_search_id', relatedSearchId);
    } else {
      query = query.eq('page_number', pageNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching web results', error);
      return;
    }

    if (data) {
      const sponsored = data.filter((r: any) => r.is_sponsored);
      const organic = data.filter((r: any) => !r.is_sponsored);
      setSponsoredResults(sponsored as WebResult[]);
      setWebResults(organic as WebResult[]);
    }
  };

  const handleResultClick = (result: WebResult) => {
    window.location.href = result.target_url;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/dataorbit" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm mb-4">
          ← Back to DataOrbitZone
        </Link>

        {searchTitle && (
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">
              Results for: {searchTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {webResults.length + sponsoredResults.length} results found
            </p>
          </div>
        )}

        {/* Sponsored Results - Dark Background */}
        {sponsoredResults.length > 0 && (
          <div className="mb-6 bg-slate-900 rounded-xl p-4">
            {sponsoredResults.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="group cursor-pointer py-4 px-3 hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                <div className="flex gap-3">
                  {/* Favicon/Logo */}
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-600">
                    {result.logo_url ? (
                      <img 
                        src={result.logo_url} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-amber-400">
                        {result.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title row with Sponsored tag */}
                    <h3 className="text-lg text-amber-400 group-hover:underline decoration-1 underline-offset-2 font-medium leading-snug mb-1">
                      {result.title}
                    </h3>
                    
                    {/* Masked domain with sponsored label */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">Sponsored</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">dataorbitzone/link/{result.position}</span>
                    </div>

                    {/* Description */}
                    {result.description && (
                      <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 italic">
                        {result.description}
                      </p>
                    )}

                    {/* Visit Website Button */}
                    <button className="mt-3 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors">
                      <span>▶</span>
                      Visit Website
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Organic Web Results - White/Light Background */}
        {webResults.length > 0 && (
          <div className="bg-background border border-border rounded-xl p-2">
            <div className="text-sm text-muted-foreground px-3 py-2 font-medium">
              Web Results
            </div>
            <div className="space-y-1">
              {webResults.map((result, index) => (
                <GoogleStyleWebResult
                  key={result.id}
                  title={result.title}
                  description={result.description}
                  logoUrl={result.logo_url}
                  targetUrl={result.target_url}
                  onClick={() => handleResultClick(result)}
                  siteName="dataorbitzone"
                  position={result.position || index + 1}
                />
              ))}
            </div>
          </div>
        )}

        {webResults.length === 0 && sponsoredResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found for this search.
          </div>
        )}

        {/* Back to search link */}
        {searchTitle && (
          <div className="mt-6 pt-4 border-t border-border">
            <Link 
              to="/dataorbit" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to: {searchTitle}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
