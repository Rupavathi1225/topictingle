import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { tejaStarinClient } from '@/integrations/tejastarin/client';

export const TejaStarinAnalytics = () => {
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalSearches: 0,
    totalWebResults: 0,
    totalEmailSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [blogsRes, searchesRes, webResultsRes, emailsRes] = await Promise.all([
        tejaStarinClient.from('blogs').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('related_searches').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('web_results').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('email_submissions').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalBlogs: blogsRes.count || 0,
        totalSearches: searchesRes.count || 0,
        totalWebResults: webResultsRes.count || 0,
        totalEmailSubmissions: emailsRes.count || 0,
      });
    } catch (error) {
      toast.error('Failed to fetch analytics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Teja Starin Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Blogs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalBlogs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Related Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalSearches}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Web Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalWebResults}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.totalEmailSubmissions}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
