import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { dataOrbitClient } from '@/integrations/dataorbit/client';
import { GoogleStyleWebResult } from '@/components/GoogleStyleWebResult';

interface WebResult {
  id: string;
  title: string;
  description?: string;
  logo?: string;
  url: string;
  name?: string;
  position: number;
  is_sponsored?: boolean;
  related_search_id?: string | null;
  has_prelanding?: boolean;
}

export const DataOrbitZoneWebResults = () => {
  const [searchParams] = useSearchParams();
  const wrNumber = parseInt(searchParams.get('wr') || '1');
  const relatedSearchId = searchParams.get('id');
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [sponsoredResults, setSponsoredResults] = useState<WebResult[]>([]);
  const [searchTitle, setSearchTitle] = useState<string>('');

  useEffect(() => {
    fetchWebResults();
    if (relatedSearchId) {
      fetchSearchTitle();
    }
  }, [wrNumber, relatedSearchId]);

  const fetchSearchTitle = async () => {
    if (!relatedSearchId) return;
    const { data } = await dataOrbitClient
      .from('related_searches')
      .select('title, search_text')
      .eq('id', relatedSearchId)
      .maybeSingle();
    if (data) {
      setSearchTitle(data.title || data.search_text || '');
    }
  };

  const fetchWebResults = async () => {
    // Query web_results from DataOrbit external database
    let query = dataOrbitClient
      .from('web_results')
      .select('*')
      .order('position', { ascending: true });

    if (relatedSearchId) {
      query = query.eq('related_search_id', relatedSearchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching web results', error);
      return;
    }

    if (data && data.length > 0) {
      // Check for pre-landing configs
      const relatedSearchIds = [...new Set(data.map((r: any) => r.related_search_id).filter(Boolean))];
      
      let prelandingSearchIds: string[] = [];
      if (relatedSearchIds.length > 0) {
        const { data: prelandings } = await dataOrbitClient
          .from('pre_landing_config')
          .select('web_result_id');
        
        if (prelandings) {
          // Get web_result_ids that have pre-landing configs
          const webResultIdsWithPrelanding = prelandings.map((p: any) => p.web_result_id);
          // Mark results that have pre-landing pages
          data.forEach((r: any) => {
            r.has_prelanding = webResultIdsWithPrelanding.includes(r.id);
          });
        }
      }

      const sponsored = data.filter((r: any) => r.is_sponsored);
      const organic = data.filter((r: any) => !r.is_sponsored);
      setSponsoredResults(sponsored as WebResult[]);
      setWebResults(organic as WebResult[]);
    } else {
      setSponsoredResults([]);
      setWebResults([]);
    }
  };

  const handleResultClick = (result: WebResult) => {
    // If has pre-landing page, redirect to prelanding first
    if (result.has_prelanding && result.related_search_id) {
      window.location.href = `/dataorbit/prelanding?search=${result.related_search_id}&redirect=${encodeURIComponent(result.url)}`;
    } else {
      window.location.href = result.url;
    }
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
                    {result.logo ? (
                      <img 
                        src={result.logo} 
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
                  logoUrl={result.logo}
                  targetUrl={result.url}
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
