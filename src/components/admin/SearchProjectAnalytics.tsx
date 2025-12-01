import { useState, useEffect } from 'react';
import { searchProjectClient } from '@/integrations/searchproject/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

export function SearchProjectAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: analytics } = await searchProjectClient
        .from('analytics')
        .select('*')
        .order('timestamp', { ascending: false });

      // Process sessions
      const sessionsData: SessionData[] = (analytics || []).map((a: any) => ({
        sessionId: a.session_id || `sp-${a.id || Math.random().toString(36).slice(2, 9)}`,
        ipAddress: a.ip_address || 'N/A',
        country: a.country || 'Unknown',
        source: a.source || 'direct',
        device: a.device || 'desktop',
        pageViews: a.page_views || 0,
        clicks: a.clicks || 0,
        relatedSearches: a.related_searches || a.result_clicks || 0,
        blogClicks: 0,
      }));

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading analytics...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Page Views</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Related Searches</TableHead>
                <TableHead>Blog Clicks</TableHead>
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
                    <TableCell className="font-mono text-xs">{session.sessionId.slice(0, 12)}...</TableCell>
                    <TableCell>{session.ipAddress}</TableCell>
                    <TableCell>{session.country}</TableCell>
                    <TableCell>{session.source}</TableCell>
                    <TableCell>{session.device}</TableCell>
                    <TableCell>{session.pageViews}</TableCell>
                    <TableCell>{session.clicks}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Total: {session.relatedSearches}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                        Total: {session.blogClicks}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
