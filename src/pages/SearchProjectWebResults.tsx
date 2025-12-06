import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchProjectClient } from '@/integrations/searchproject/client';
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

export const SearchProjectWebResults = () => {
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
    const { data } = await searchProjectClient
      .from('related_searches')
      .select('title, search_text')
      .eq('id', relatedSearchId)
      .single();
    if (data) {
      setSearchTitle(data.title || data.search_text);
    }
  };

  const fetchWebResults = async () => {
    let query = searchProjectClient
      .from('web_results')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (relatedSearchId) {
      query = query.eq('related_search_id', relatedSearchId);
    } else {
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

  const handleResultClick = (result: WebResult) => {
    if (result.pre_landing_page_key) {
      window.location.href = `/searchproject/prelanding?page=${result.pre_landing_page_key}`;
    } else {
      window.location.href = result.target_url;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/searchproject" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm mb-4">
          ← Back to SearchProject
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

        {/* Sponsored Results */}
        {sponsoredResults.length > 0 && (
          <div className="mb-6">
            {sponsoredResults.map((result, index) => (
              <GoogleStyleWebResult
                key={result.id}
                title={result.title}
                description={result.description}
                logoUrl={result.logo_url}
                targetUrl={result.target_url}
                isSponsored={true}
                onClick={() => handleResultClick(result)}
                siteName="searchproject"
                position={result.position || index + 1}
              />
            ))}
          </div>
        )}

        {/* Organic Web Results */}
        <div className="space-y-1">
          {webResults.map((result, index) => (
            <GoogleStyleWebResult
              key={result.id}
              title={result.title}
              description={result.description}
              logoUrl={result.logo_url}
              targetUrl={result.target_url}
              onClick={() => handleResultClick(result)}
              siteName="searchproject"
              position={result.position || index + 1}
            />
          ))}
        </div>

        {webResults.length === 0 && sponsoredResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No results found for this search.
          </div>
        )}
      </div>
    </div>
  );
};