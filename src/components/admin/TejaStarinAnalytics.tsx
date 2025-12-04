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
  lastActive: string;
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
      // Fetch stats counts
      const [blogsRes, searchesRes, webResultsRes, emailsRes] = await Promise.all([
        tejaStarinClient.from('blogs').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('related_searches').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('web_results').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('email_submissions').select('*'),
      ]);

      // Fetch sessions without ordering to avoid column errors
      const sessionsRes = await tejaStarinClient.from('sessions').select('*');
      console.log('DataCreditZone TejaStarinAnalytics sessions:', sessionsRes);

      setStats({
        totalBlogs: blogsRes.count || 0,
        totalSearches: searchesRes.count || 0,
        totalWebResults: webResultsRes.count || 0,
        totalEmailSubmissions: emailsRes.data?.length || 0,
      });

      // Fetch additional data for breakdown
      const { data: relSearches } = await tejaStarinClient
        .from('related_searches')
        .select('*');
      
      const { data: blogs } = await tejaStarinClient
        .from('blogs')
        .select('*');

      const { data: clicks } = await tejaStarinClient
        .from('link_tracking')
        .select('*');

      // Process sessions - sort in JS since column names may vary
      const sessionMap = new Map<string, SessionData>();
      const sessionClickIds = new Map<string, Set<string>>();
      
      // Sort sessions by available timestamp field
      const sortedSessions = (sessionsRes.data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.last_active || a.last_activity || a.created_at || 0);
        const dateB = new Date(b.last_active || b.last_activity || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Initialize sessions from sessions table
      sortedSessions.forEach((session: any) => {
        const sid = session.session_id;
        sessionMap.set(sid, {
          sessionId: sid,
          ipAddress: session.ip_address || 'N/A',
          country: session.country || 'Unknown',
          source: session.source || 'direct',
          device: session.device_type?.toLowerCase().includes('mobile') ? 'mobile' : (session.device === 'mobile' ? 'mobile' : 'desktop'),
          pageViews: session.page_views || 1,
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearches: 0,
          blogClicks: 0,
          clickBreakdown: {
            relatedSearches: [],
            blogClicks: [],
          },
          lastActive: session.last_active || session.last_activity || session.created_at || new Date().toISOString(),
        });
        sessionClickIds.set(sid, new Set());
      });

      // Process clicks from link_tracking
      (clicks || []).forEach((click: any) => {
        const sid = click.session_id;
        if (!sessionMap.has(sid)) return;
        
        const session = sessionMap.get(sid)!;
        session.totalClicks++;
        
        // Track unique clicks
        if (click.id) {
          sessionClickIds.get(sid)!.add(click.id);
        }
        
        // Count related search interactions with breakdown
        if (click.related_search_id) {
          session.relatedSearches++;
          const relSearch = relSearches?.find(rs => rs.id === click.related_search_id);
          const searchText = relSearch?.search_text || relSearch?.title || 'Unknown Search';
          
          const existing = session.clickBreakdown.relatedSearches.find(s => s.text === searchText);
          if (existing) {
            existing.count++;
          } else {
            session.clickBreakdown.relatedSearches.push({ text: searchText, count: 1 });
          }
        }
        
        // Count web result/blog clicks with breakdown
        if (click.web_result_id) {
          session.blogClicks++;
          const blogTitle = click.target_url || 'Unknown Result';
          
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

      // Sort by last active descending (latest first)
      const finalSessions = Array.from(sessionMap.values()).sort((a, b) => 
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
      );

      setSessions(finalSessions);
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
      <h3 className="text-xl font-semibold">DataCreditZone Analytics</h3>
      
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
                <TableHead className="text-center">Result Clicks</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
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
                            <DialogTitle>Result Clicks Breakdown</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {session.clickBreakdown.blogClicks.length > 0 ? (
                              session.clickBreakdown.blogClicks.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span className="text-sm truncate max-w-[200px]">{item.title}</span>
                                  <Badge>{item.count} clicks</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No result clicks</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(session.lastActive).toLocaleString()}
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
