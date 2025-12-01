import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export function TopicMingleAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*');

      const { data: clicks } = await supabase
        .from('clicks')
        .select('*');

      const { data: relatedSearches } = await supabase
        .from('related_searches')
        .select('*');

      // Process sessions
      const sessionMap = new Map<string, SessionData>();

      (sessionData || []).forEach((session: any) => {
        sessionMap.set(session.session_id, {
          sessionId: session.session_id,
          ipAddress: session.ip_address || 'N/A',
          country: session.country || 'Unknown',
          source: session.source || 'direct',
          device: session.user_agent?.includes('Mobile') ? 'mobile' : 'desktop',
          pageViews: 0,
          clicks: 0,
          relatedSearches: 0,
          blogClicks: 0,
        });
      });

      // Count page views
      (pageViews || []).forEach((view: any) => {
        const session = sessionMap.get(view.session_id);
        if (session) {
          session.pageViews++;
        }
      });

      // Count clicks
      (clicks || []).forEach((click: any) => {
        const session = sessionMap.get(click.session_id);
        if (session) {
          session.clicks++;
          if (click.button_id?.includes('blog')) {
            session.blogClicks++;
          }
        }
      });

      // Count related searches
      (relatedSearches || []).forEach((search: any) => {
        if (search.session_id) {
          const session = sessionMap.get(search.session_id);
          if (session) {
            session.relatedSearches++;
          }
        }
      });

      setSessions(Array.from(sessionMap.values()));
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
