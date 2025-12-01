import { useState, useEffect } from 'react';
import { searchProjectClient } from '@/integrations/searchproject/client';
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

      // Group by session and aggregate
      const sessionMap = new Map<string, SessionData>();
      const sessionClickIds = new Map<string, Set<string>>();

      (analytics || []).forEach((a: any) => {
        const sid = a.session_id || `sp-${a.id || Math.random().toString(36).slice(2, 9)}`;
        
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, {
            sessionId: sid,
            ipAddress: a.ip_address || 'N/A',
            country: a.country || 'Unknown',
            source: a.source || 'direct',
            device: a.device || 'desktop',
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
        
        // Aggregate data
        session.pageViews += a.page_views || 0;
        session.totalClicks += a.clicks || 0;
        
        // Track related searches with breakdown
        const relSearchCount = a.related_searches || a.result_clicks || 0;
        session.relatedSearches += relSearchCount;
        if (relSearchCount > 0 && a.search_query) {
          const existing = session.clickBreakdown.relatedSearches.find(s => s.text === a.search_query);
          if (existing) {
            existing.count += relSearchCount;
          } else {
            session.clickBreakdown.relatedSearches.push({ text: a.search_query, count: relSearchCount });
          }
        }
        
        // Track blog clicks with breakdown
        if (a.blog_clicks) {
          session.blogClicks += a.blog_clicks;
          if (a.blog_title) {
            const existing = session.clickBreakdown.blogClicks.find(b => b.title === a.blog_title);
            if (existing) {
              existing.count += a.blog_clicks;
            } else {
              session.clickBreakdown.blogClicks.push({ title: a.blog_title, count: a.blog_clicks });
            }
          }
        }
        
        // Track unique button IDs
        if (a.button_id) {
          sessionClickIds.get(sid)!.add(a.button_id);
        }
      });

      // Set unique clicks
      sessionClickIds.forEach((clickIds, sid) => {
        const session = sessionMap.get(sid);
        if (session) {
          session.uniqueClicks = clickIds.size || session.totalClicks;
        }
      });

      const sessionsData = Array.from(sessionMap.values());

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
