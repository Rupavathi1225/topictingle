import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      const { data: relatedSearchesData } = await supabase
        .from('related_searches')
        .select('*');

      const { data: blogsData } = await supabase
        .from('blogs')
        .select('id, title');

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
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearches: 0,
          blogClicks: 0,
          clickBreakdown: {
            relatedSearches: [],
            blogClicks: [],
          },
        });
      });

      // Count page views
      (pageViews || []).forEach((view: any) => {
        const session = sessionMap.get(view.session_id);
        if (session) {
          session.pageViews++;
        }
      });

      // Process clicks and build breakdown
      (clicks || []).forEach((click: any) => {
        const session = sessionMap.get(click.session_id);
        if (session) {
          session.totalClicks++;
          
          // Track blog clicks with breakdown
          if (click.button_id?.includes('blog') || click.button_label?.toLowerCase().includes('blog')) {
            session.blogClicks++;
            const blogId = click.button_id?.replace('blog-', '');
            const blog = blogsData?.find(b => b.id === blogId);
            const blogTitle = blog?.title || click.button_label || 'Unknown Blog';
            
            const existingBlog = session.clickBreakdown.blogClicks.find(b => b.title === blogTitle);
            if (existingBlog) {
              existingBlog.count++;
            } else {
              session.clickBreakdown.blogClicks.push({ title: blogTitle, count: 1 });
            }
          }
          
          // Track related search clicks with breakdown
          if (click.button_id?.includes('related-search') || click.button_label?.toLowerCase().includes('search')) {
            session.relatedSearches++;
            const searchText = click.button_label || 'Unknown Search';
            
            const existingSearch = session.clickBreakdown.relatedSearches.find(s => s.text === searchText);
            if (existingSearch) {
              existingSearch.count++;
            } else {
              session.clickBreakdown.relatedSearches.push({ text: searchText, count: 1 });
            }
          }
        }
      });

      // Calculate unique clicks (unique button_ids per session)
      const sessionClicks = new Map<string, Set<string>>();
      (clicks || []).forEach((click: any) => {
        if (!sessionClicks.has(click.session_id)) {
          sessionClicks.set(click.session_id, new Set());
        }
        sessionClicks.get(click.session_id)!.add(click.button_id);
      });
      
      sessionClicks.forEach((buttonIds, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.uniqueClicks = buttonIds.size;
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
