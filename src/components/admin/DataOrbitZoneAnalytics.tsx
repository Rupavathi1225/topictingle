import { useState, useEffect } from 'react';
import { dataOrbitZoneClient } from '@/integrations/dataorbitzone/client';
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

export function DataOrbitZoneAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: analytics } = await dataOrbitZoneClient
        .from('analytics')
        .select('*')
        .order('created_at', { ascending: false });

      // Process sessions
      const sessionMap = new Map<string, SessionData>();

      (analytics || []).forEach((event: any) => {
        const sid = event.session_id || `anon-${event.ip_address || 'unknown'}`;
        
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, {
            sessionId: sid,
            ipAddress: event.ip_address || 'N/A',
            country: event.country || 'Unknown',
            source: event.source || 'direct',
            device: event.device || 'desktop',
            pageViews: 0,
            clicks: 0,
            relatedSearches: 0,
            blogClicks: 0,
          });
        }

        const session = sessionMap.get(sid)!;
        const eventType = (event.event_type || '').toString().toLowerCase();

        // Count page views
        if (eventType.includes('page') || eventType.includes('view')) {
          session.pageViews++;
        }

        // Count clicks
        if (eventType.includes('click') || eventType.includes('button')) {
          session.clicks++;
          
          // Count related search clicks
          if (event.related_search_id || event.button_id?.includes('related-search')) {
            session.relatedSearches++;
          }
          
          // Count blog clicks
          if (event.blog_id || event.button_id?.includes('blog')) {
            session.blogClicks++;
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
