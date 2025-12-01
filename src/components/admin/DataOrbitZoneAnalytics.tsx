import { useState, useEffect } from 'react';
import { dataOrbitZoneClient } from '@/integrations/dataorbitzone/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ClickBreakdown {
  relatedSearches: { text: string; count: number }[];
  blogClicks: { title: string; count: number }[];
}

interface SessionData {
  sessionId: string;
  ipAddress: string;
  country: string;
  source: string;
  device: string;
  pageViews: number;
  totalClicks: number;
  uniqueClicks: number;
  relatedSearches: number;
  blogClicks: number;
  clickBreakdown: ClickBreakdown;
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
      const sessionClickIds = new Map<string, Set<string>>();

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
            totalClicks: 0,
            uniqueClicks: 0,
            relatedSearches: 0,
            blogClicks: 0,
            clickBreakdown: {
              relatedSearches: [],
              blogClicks: [],
            },
          });
          sessionClickIds.set(sid, new Set());
        }

        const session = sessionMap.get(sid)!;
        const eventType = (event.event_type || '').toString().toLowerCase();

        // Count page views
        if (eventType.includes('page') || eventType.includes('view')) {
          session.pageViews++;
        }

        // Count clicks
        if (eventType.includes('click') || eventType.includes('button')) {
          session.totalClicks++;
          
          // Track unique clicks
          if (event.button_id) {
            sessionClickIds.get(sid)!.add(event.button_id);
          }
          
          // Count related search clicks with breakdown
          if (event.related_search_id || event.button_id?.includes('related-search')) {
            session.relatedSearches++;
            const searchText = event.search_text || event.button_label || 'Unknown Search';
            
            const existing = session.clickBreakdown.relatedSearches.find(s => s.text === searchText);
            if (existing) {
              existing.count++;
            } else {
              session.clickBreakdown.relatedSearches.push({ text: searchText, count: 1 });
            }
          }
          
          // Count blog clicks with breakdown
          if (event.blog_id || event.button_id?.includes('blog')) {
            session.blogClicks++;
            const blogTitle = event.blog_title || event.button_label || 'Unknown Blog';
            
            const existing = session.clickBreakdown.blogClicks.find(b => b.title === blogTitle);
            if (existing) {
              existing.count++;
            } else {
              session.clickBreakdown.blogClicks.push({ title: blogTitle, count: 1 });
            }
          }
        }
      });

      // Set unique clicks
      sessionClickIds.forEach((clickIds, sid) => {
        const session = sessionMap.get(sid);
        if (session) {
          session.uniqueClicks = clickIds.size;
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
                <TableHead>Clicks (Total/Unique)</TableHead>
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
                    <TableCell>{session.totalClicks} / {session.uniqueClicks}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-0">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800">
                              Total: {session.relatedSearches}
                            </Badge>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Related Search Clicks Breakdown</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {session.clickBreakdown.relatedSearches.length > 0 ? (
                              session.clickBreakdown.relatedSearches.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span className="text-sm">{item.text}</span>
                                  <Badge>{item.count} clicks</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No related search clicks</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-0">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800">
                              Total: {session.blogClicks}
                            </Badge>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Blog Clicks Breakdown</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {session.clickBreakdown.blogClicks.length > 0 ? (
                              session.clickBreakdown.blogClicks.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span className="text-sm">{item.title}</span>
                                  <Badge>{item.count} clicks</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No blog clicks</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
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
