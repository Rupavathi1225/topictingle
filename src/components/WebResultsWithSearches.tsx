import { useEffect, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  position: number;
  pre_landing_page_key: string | null;
}

interface WebResultsWithSearchesProps {
  projectClient: any;
  currentPage: number;
}

export const WebResultsWithSearches = ({ projectClient, currentPage }: WebResultsWithSearchesProps) => {
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
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
    const fetchRelatedSearches = async () => {
      const { data } = await projectClient
        .from('related_searches')
        .select('*')
        .eq('web_result_page', currentPage)
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (data) {
        const filteredSearches = data.filter((search: any) => 
          search.allowed_countries?.includes('WW') || 
          search.allowed_countries?.includes(userCountry)
        ).slice(0, 4);
        setSearches(filteredSearches);
      }
    };

    if (userCountry) {
      fetchRelatedSearches();
    }
  }, [currentPage, userCountry]);

  const handleSearchClick = (search: RelatedSearch) => {
    // Navigate to web results with related search ID to show only that search's results
    window.location.href = `/wr?rs=${search.id}`;
  };

  if (searches.length === 0) return null;

  return (
    <div className="my-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Related Searches</h3>
      </div>
      <div className="grid gap-2">
        {searches.map((search) => (
          <button
            key={search.id}
            onClick={() => handleSearchClick(search)}
            className="flex items-center justify-between p-4 bg-card hover:bg-accent/50 text-foreground rounded-xl transition-all duration-200 group border border-border hover:border-primary/30 hover:shadow-sm"
          >
            <span className="text-left font-medium">{search.title || search.search_text}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};