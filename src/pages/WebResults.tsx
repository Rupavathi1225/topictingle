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
  related_search_id?: string;
}

export const WebResults = () => {
  const [searchParams] = useSearchParams();
  const pageNumber = parseInt(searchParams.get('wr') || '1');
  const relatedSearchId = searchParams.get('rs'); // Filter by related search
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [sponsoredResults, setSponsoredResults] = useState<WebResult[]>([]);
  const [searchTitle, setSearchTitle] = useState<string>('');
  const { sessionId, trackClick } = useTracking();

  // Generate masked URL like "topicmingle.link1"
  const getMaskedUrl = (index: number) => {
    return `topicmingle.link${index + 1}`;
  };

  useEffect(() => {
    fetchWebResults();
    if (relatedSearchId) {
      fetchSearchTitle();
    }
  }, [pageNumber, relatedSearchId]);

  const fetchSearchTitle = async () => {
    if (!relatedSearchId) return;
    const { data } = await supabase
      .from('related_searches')
      .select('title, search_text')
      .eq('id', relatedSearchId)
      .single();
    if (data) {
      setSearchTitle(data.title || data.search_text);
    }
  };

  const fetchWebResults = async () => {
    let query = supabase
      .from('web_results')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    // If related_search_id is provided, filter by it
    if (relatedSearchId) {
      query = query.eq('related_search_id', relatedSearchId);
    } else {
      // Otherwise filter by page number
      query = query.eq('page_number', pageNumber);
    }
    
    const { data } = await query;
    
    if (data) {
      const sponsored = data.filter(r => r.is_sponsored);
      const organic = data.filter(r => !r.is_sponsored);
      setSponsoredResults(sponsored);
      setWebResults(organic);
    }
  };

  const handleResultClick = async (result: WebResult) => {
    await trackClick(`web-result-${result.id}`, result.title);
    
    if (result.pre_landing_page_key) {
      window.location.href = `/prelanding?page=${result.pre_landing_page_key}`;
    } else {
      window.location.href = result.target_url;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm mb-4">
          ← Back to Home
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
          <div className="bg-slate-900 rounded-xl p-6 mb-6">
            <div className="space-y-6">
              {sponsoredResults.map((result, index) => (
                <div key={result.id} className="group">
                  {/* Title */}
                  <h3 
                    onClick={() => handleResultClick(result)}
                    className="text-amber-400 hover:underline cursor-pointer text-lg font-medium mb-1"
                  >
                    {result.title}
                  </h3>
                  
                  {/* Sponsored + URL */}
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="text-gray-400">Sponsored</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-400">{getMaskedUrl(index)}</span>
                    <button className="text-gray-500 hover:text-gray-300">⋮</button>
                  </div>
                  
                  {/* Description */}
                  {result.description && (
                    <p className="text-amber-200/70 text-sm mb-3 italic">
                      {result.description}
                    </p>
                  )}
                  
                  {/* Visit Website Button */}
                  <button
                    onClick={() => handleResultClick(result)}
                    className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded transition-colors"
                  >
                    <span className="text-lg">▶</span> Visit Website
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organic Web Results - White Background */}
        {webResults.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-3">Web Results</p>
            <div className="space-y-4">
              {webResults.map((result, index) => (
                <div 
                  key={result.id} 
                  onClick={() => handleResultClick(result)}
                  className="cursor-pointer group"
                >
                  {/* Site info row */}
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={result.logo_url || `https://www.google.com/s2/favicons?domain=${new URL(result.target_url).hostname}&sz=32`}
                      alt=""
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="text-sm">
                      <span className="text-gray-700 font-medium">{getMaskedUrl(sponsoredResults.length + index)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1 truncate">{getMaskedUrl(sponsoredResults.length + index)}</p>
                  
                  {/* Title */}
                  <h3 className="text-blue-700 hover:underline text-lg font-medium mb-1">
                    {result.title}
                  </h3>
                  
                  {/* Description */}
                  {result.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {webResults.length === 0 && sponsoredResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found for this search.
          </div>
        )}
      </div>
    </div>
  );
};
