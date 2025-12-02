import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PreLandingPageData {
  id: string;
  page_key: string;
  logo_url: string | null;
  logo_position: string | null;
  logo_width: number | null;
  main_image_url: string | null;
  image_ratio: string | null;
  headline: string;
  description: string | null;
  headline_font_size: number | null;
  headline_color: string | null;
  headline_align: string | null;
  description_font_size: number | null;
  description_color: string | null;
  description_align: string | null;
  cta_text: string | null;
  cta_color: string | null;
  background_color: string | null;
  background_image_url: string | null;
  target_url: string;
}

interface RelatedSearchData {
  id: string;
  search_text: string;
  target_url?: string;
  title?: string;
  pre_landing_page_key?: string;
}

export default function DataOrbitZonePreLanding() {
  const [searchParams] = useSearchParams();
  const searchId = searchParams.get('search');
  const [pageData, setPageData] = useState<PreLandingPageData | null>(null);
  const [searchData, setSearchData] = useState<RelatedSearchData | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchId) {
      fetchPageData(searchId);
    } else {
      setLoading(false);
    }
  }, [searchId]);

  const fetchPageData = async (id: string) => {
    // Fetch the related search first
    const { data: related, error: relatedError } = await supabase
      .from('related_searches')
      .select('*')
      .eq('id', id)
      .eq('session_id', 'dataorbitzone')
      .maybeSingle();

    if (relatedError || !related) {
      console.error('Error fetching related search', relatedError);
      toast.error('Page not found');
      setLoading(false);
      return;
    }

    setSearchData(related as RelatedSearchData);

    // Then fetch the prelanding configuration using pre_landing_page_key
    const preLandingKey = related.pre_landing_page_key;
    if (!preLandingKey) {
      console.error('No pre-landing page key found');
      toast.error('Page configuration not found');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('pre_landing_pages')
      .select('*')
      .eq('page_key', preLandingKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching prelanding page', error);
      toast.error('Page not found');
      setLoading(false);
      return;
    }

    setPageData(data as PreLandingPageData);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !pageData || !searchData) return;

    setSubmitting(true);

    try {
      let country = 'Unknown';
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        country = data.country_code || 'Unknown';
      } catch (err) {
        console.error('Failed to get country:', err);
      }

      const { error } = await supabase.from('email_captures').insert([
        {
          email,
          page_key: searchData.id,
          source: window.location.href,
          country,
        },
      ]);

      if (error) {
        toast.error('Failed to save email');
        setSubmitting(false);
        return;
      }

      toast.success('Email captured successfully!');

      setTimeout(() => {
        if (searchData.target_url) {
          window.location.href = searchData.target_url;
        } else if (pageData.target_url) {
          window.location.href = pageData.target_url;
        }
      }, 1000);
    } catch (err) {
      toast.error('Something went wrong');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!pageData || !searchData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Page not found</p>
      </div>
    );
  }

  const aspectRatioClass =
    pageData.image_ratio === '16:9'
      ? 'aspect-video'
      : pageData.image_ratio === '4:3'
      ? 'aspect-[4/3]'
      : 'aspect-square';

  const headlineFontSize = pageData.headline_font_size ?? 32;
  const descriptionFontSize = pageData.description_font_size ?? 16;
  const textAlign = (pageData.headline_align || 'center') as any;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: pageData.background_color || '#ffffff',
        backgroundImage: pageData.background_image_url
          ? `url(${pageData.background_image_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {pageData.logo_url && (
        <div
          className={`p-6 ${
            pageData.logo_position === 'top-center' ? 'flex justify-center' : ''
          }`}
        >
          <img
            src={pageData.logo_url}
            alt="Logo"
            style={{ width: `${pageData.logo_width || 150}px` }}
            className="object-contain"
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {pageData.main_image_url && (
            <div className={`w-full ${aspectRatioClass} overflow-hidden rounded-lg`}>
              <img
                src={pageData.main_image_url}
                alt="Main"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1
            style={{
              fontSize: `${headlineFontSize}px`,
              color: pageData.headline_color || '#000000',
              textAlign: textAlign,
            }}
            className="font-bold leading-tight"
          >
            {pageData.headline}
          </h1>

          {pageData.description && (
            <p
              style={{
                fontSize: `${descriptionFontSize}px`,
                color: pageData.description_color || '#666666',
                textAlign: textAlign,
              }}
              className="leading-relaxed"
            >
              {pageData.description}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="h-12 text-lg bg-white border-2"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-lg font-semibold"
              style={{
                backgroundColor: pageData.cta_color || '#10b981',
                color: '#ffffff',
              }}
            >
              {submitting ? 'Submitting...' : pageData.cta_text || 'Get Started'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
