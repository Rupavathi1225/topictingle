import { ChevronRight } from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  display_order: number;
  allowed_countries: string[];
  web_result_page: number;
  position: number;
  pre_landing_page_key: string | null;
}

interface RelatedSearchesProps {
  blogId: string;
  categoryId?: number;
}

const RelatedSearches = ({ blogId, categoryId }: RelatedSearchesProps) => {
  const { trackClick } = useTracking();
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [userCountry, setUserCountry] = useState<string>('WW');

  useEffect(() => {
    // Get user's country
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
      // First try to load searches linked directly to this blog
      let { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .eq('blog_id', blogId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching related searches by blog:', error);
        return;
      }

      // If no blog-specific searches, fall back to category-based ones
      if ((!data || data.length === 0) && categoryId) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('related_searches')
          .select('*')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (categoryError) {
          console.error('Error fetching related searches by category:', categoryError);
          return;
        }

        data = categoryData || [];
      }

      if (data) {
        // Filter by country
        const filteredSearches = data
          .filter((search: any) =>
            search.allowed_countries.includes('WW') ||
            search.allowed_countries.includes(userCountry)
          )
          .slice(0, 4);
        setSearches(filteredSearches);
      }
    };

    if (userCountry) {
      fetchRelatedSearches();
    }
  }, [blogId, categoryId, userCountry]);

  const handleSearchClick = async (search: RelatedSearch) => {
    try {
      // Track the click
      await trackClick(`related-search-${search.search_text}`, search.title || search.search_text);
      
      // If there's a pre-landing page, redirect there
      if (search.pre_landing_page_key) {
        window.location.href = `/prelanding?page=${search.pre_landing_page_key}`;
      } else {
        // Redirect to the web result page specified in the search
        window.location.href = `/wr?wr=${search.web_result_page}`;
      }
    } catch (error) {
      console.error('Error tracking related search click:', error);
      // Still redirect even if tracking fails
      if (search.pre_landing_page_key) {
        window.location.href = `/prelanding?page=${search.pre_landing_page_key}`;
      } else {
        window.location.href = `/wr?wr=${search.web_result_page}`;
      }
    }
  };

  if (searches.length === 0) return null;

  return (
    <div className="my-12">
      <h3 className="text-sm font-semibold text-blog-meta mb-4">Related searches</h3>
      <div className="grid gap-4">
        {searches.map((search) => (
          <button
            key={search.id}
            onClick={() => handleSearchClick(search)}
            className="flex items-center justify-between p-4 bg-[#1a2332] hover:bg-[#243042] text-white rounded-lg transition-colors duration-200 group"
          >
            <span className="text-left font-medium">{search.title || search.search_text}</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedSearches;