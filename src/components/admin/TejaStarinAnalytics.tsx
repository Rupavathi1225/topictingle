import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';

interface SessionData {
  sessionId: string;
  ipAddress: string;
  country: string;
  source: string;
  device: string;
  pageViews: number;
  clicks: number;
  relatedSearches: number;
  blogClicks: number;
}

export const TejaStarinAnalytics = () => {
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalSearches: 0,
    totalWebResults: 0,
    totalEmailSubmissions: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
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
        tejaStarinClient.from('email_submissions').select('*'),
      ]);

      setStats({
        totalBlogs: blogsRes.count || 0,
        totalSearches: searchesRes.count || 0,
        totalWebResults: webResultsRes.count || 0,
        totalEmailSubmissions: emailsRes.count || 0,
      });

      // Process sessions from email submissions
      const sessionMap = new Map<string, SessionData>();
      
      (emailsRes.data || []).forEach((submission: any) => {
        const sid = submission.session_id || `anon-${submission.ip_address || 'unknown'}`;
        
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, {
            sessionId: sid,
            ipAddress: submission.ip_address || 'N/A',
            country: submission.country || 'Unknown',
            source: submission.source || 'direct',
            device: 'desktop',
            pageViews: 0,
            clicks: 0,
            relatedSearches: 0,
            blogClicks: 0,
          });
        }
        
        const session = sessionMap.get(sid)!;
        session.pageViews++;
        session.clicks++;
        
        // Count related search interactions
        if (submission.related_search_id) {
          session.relatedSearches++;
        }
      });

      setSessions(Array.from(sessionMap.values()));
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

      <Card>
        <CardHeader>
          <CardTitle>Session Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-center">Page Views</TableHead>
                <TableHead className="text-center">Clicks</TableHead>
                <TableHead className="text-center">Related Searches</TableHead>
                <TableHead className="text-center">Blog Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No session data available
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.sessionId}>
                    <TableCell className="font-mono text-xs">
                      {session.sessionId.substring(0, 20)}...
                    </TableCell>
                    <TableCell>{session.ipAddress}</TableCell>
                    <TableCell>{session.country}</TableCell>
                    <TableCell>{session.source}</TableCell>
                    <TableCell>{session.device}</TableCell>
                    <TableCell className="text-center">{session.pageViews}</TableCell>
                    <TableCell className="text-center">{session.clicks}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Total: {session.relatedSearches}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                        Total: {session.blogClicks}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
