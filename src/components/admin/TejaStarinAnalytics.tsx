import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

      // Fetch additional data for breakdown
      const { data: relSearches } = await tejaStarinClient
        .from('related_searches')
        .select('*');
      
      const { data: blogs } = await tejaStarinClient
        .from('blogs')
        .select('*');

      // Process sessions from email submissions
      const sessionMap = new Map<string, SessionData>();
      const sessionClickIds = new Map<string, Set<string>>();
      
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
        session.pageViews++;
        session.totalClicks++;
        
        // Track unique clicks
        if (submission.button_id) {
          sessionClickIds.get(sid)!.add(submission.button_id);
        }
        
        // Count related search interactions with breakdown
        if (submission.related_search_id) {
          session.relatedSearches++;
          const relSearch = relSearches?.find(rs => rs.id === submission.related_search_id);
          const searchText = relSearch?.search_text || 'Unknown Search';
          
          const existing = session.clickBreakdown.relatedSearches.find(s => s.text === searchText);
          if (existing) {
            existing.count++;
          } else {
            session.clickBreakdown.relatedSearches.push({ text: searchText, count: 1 });
          }
        }
        
        // Count blog clicks with breakdown
        if (submission.blog_id) {
          session.blogClicks++;
          const blog = blogs?.find(b => b.id === submission.blog_id);
          const blogTitle = blog?.title || 'Unknown Blog';
          
          const existing = session.clickBreakdown.blogClicks.find(b => b.title === blogTitle);
          if (existing) {
            existing.count++;
          } else {
            session.clickBreakdown.blogClicks.push({ title: blogTitle, count: 1 });
          }
        }
      });

      // Set unique clicks
      sessionClickIds.forEach((clickIds, sid) => {
        const session = sessionMap.get(sid);
        if (session) {
          session.uniqueClicks = clickIds.size || session.totalClicks;
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
                <TableHead className="text-center">Clicks (Total/Unique)</TableHead>
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
                    <TableCell className="text-center">{session.totalClicks} / {session.uniqueClicks}</TableCell>
                    <TableCell className="text-center">
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
                    <TableCell className="text-center">
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
        </CardContent>
      </Card>
    </div>
  );
};
