import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

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
    // Always redirect to web results page first - prelanding is handled at web result click level
    window.location.href = `/wr?wr=${search.web_result_page}`;
  };

  if (searches.length === 0) return null;

  return (
    <div className="my-12 max-w-4xl mx-auto px-4">
      <h3 className="text-lg font-semibold mb-4">Related Searches</h3>
      <div className="grid gap-3">
        {searches.map((search) => (
          <button
            key={search.id}
            onClick={() => handleSearchClick(search)}
            className="flex items-center justify-between p-4 bg-card hover:bg-accent text-foreground rounded-lg transition-colors duration-200 group border"
          >
            <span className="text-left font-medium">{search.title || search.search_text}</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
};
