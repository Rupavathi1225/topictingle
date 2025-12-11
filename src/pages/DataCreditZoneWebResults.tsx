import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tejaStarinClient } from "@/integrations/tejastarin/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GoogleStyleWebResult } from "@/components/GoogleStyleWebResult";

interface WebResult {
  id: string;
  title: string;
  description: string | null;
  url: string;
  logo_url: string | null;
  is_sponsored: boolean;
  order_index: number;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  wr: number;
}

const DataCreditZoneWebResults = () => {
  const [searchParams] = useSearchParams();
  const searchId = searchParams.get("id");
  const wrParam = searchParams.get("wr");
  
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [relatedSearch, setRelatedSearch] = useState<RelatedSearch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!searchId) {
        setLoading(false);
        return;
      }

      // Get the related search info
      const { data: searchData } = await tejaStarinClient
        .from("related_searches")
        .select("*")
        .eq("id", searchId)
        .maybeSingle();

      if (searchData) {
        setRelatedSearch(searchData as RelatedSearch);
      }

      // Get web results for this related search
      const { data: results } = await tejaStarinClient
        .from("web_results")
        .select("*")
        .eq("related_search_id", searchId)
        .eq("is_active", true)
        .order("order_index");

      if (results) {
        setWebResults(results as WebResult[]);
      }

      setLoading(false);
    };

    load();
  }, [searchId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {relatedSearch && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {relatedSearch.search_text}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {webResults.length} results found
                </p>
              </div>
            )}

            <div className="space-y-6">
              {webResults.map((result, idx) => (
                <GoogleStyleWebResult
                  key={result.id}
                  title={result.title}
                  targetUrl={result.url}
                  description={result.description || ""}
                  logoUrl={result.logo_url || undefined}
                  isSponsored={result.is_sponsored}
                  onClick={() => window.open(result.url, '_blank')}
                  position={idx}
                />
              ))}

              {webResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
};

export default DataCreditZoneWebResults;
