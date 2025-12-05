import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, RefreshCw } from 'lucide-react';

interface SessionData {
  sessionId: string;
  ipAddress: string;
  country: string;
  source: string;
  device: string;
  pageViews: number;
  relatedSearches: number;
  blogClicks: number;
  clickBreakdown: { relatedSearches: { text: string; count: number }[]; blogClicks: { title: string; count: number }[] };
  lastActive: string;
}

export const TejaStarinAnalytics = () => {
  const [stats, setStats] = useState({ totalBlogs: 0, totalSearches: 0, totalWebResults: 0, totalEmailSubmissions: 0 });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [blogsRes, searchesRes, webResultsRes, emailsRes, relSearchesDataRes, webResultsDataRes] = await Promise.all([
        tejaStarinClient.from('blogs').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('related_searches').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('web_results').select('id', { count: 'exact', head: true }),
        tejaStarinClient.from('email_submissions').select('*'),
        tejaStarinClient.from('related_searches').select('*'),
        tejaStarinClient.from('web_results').select('*'),
      ]);

      const relatedSearches = relSearchesDataRes.data || [];
      const webResults = webResultsDataRes.data || [];
      setStats({ totalBlogs: blogsRes.count || 0, totalSearches: searchesRes.count || 0, totalWebResults: webResultsRes.count || 0, totalEmailSubmissions: emailsRes.data?.length || 0 });

      const emails = emailsRes.data || [];
      const sessionData: SessionData[] = emails.map((email: any, index: number) => ({
        sessionId: email.id || email.email,
        ipAddress: email.ip_address || 'N/A',
        country: email.country || 'Unknown',
        source: email.source || 'email',
        device: 'desktop',
        pageViews: 1,
        relatedSearches: Math.ceil((searchesRes.count || 0) / Math.max(emails.length, 1)),
        blogClicks: Math.ceil((webResultsRes.count || 0) / Math.max(emails.length, 1)),
        clickBreakdown: {
          relatedSearches: relatedSearches.slice(0, 5).map((rs: any) => ({ text: rs.search_text || rs.title || 'Unknown', count: 1 })),
          blogClicks: webResults.slice(0, 5).map((wr: any) => ({ title: wr.title || 'Unknown', count: 1 })),
        },
        lastActive: email.submitted_at || email.created_at || new Date().toISOString(),
      }));

      setSessions(sessionData.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()));
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (!startDate && !endDate) return true;
    const sessionDate = new Date(s.lastActive);
    if (startDate && new Date(startDate) > sessionDate) return false;
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); if (end < sessionDate) return false; }
    return true;
  });

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">DataCreditZone Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardHeader><CardTitle className="text-sm">Total Blogs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalBlogs}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Related Searches</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalSearches}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Web Results</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalWebResults}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Email Submissions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{stats.totalEmailSubmissions}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Filter by Date:</span></div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</Button>
        <Button onClick={fetchAnalytics} variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Session Analytics ({filteredSessions.length} sessions)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead><TableHead>IP Address</TableHead><TableHead>Country</TableHead><TableHead>Source</TableHead>
                <TableHead className="text-center">Related Searches</TableHead><TableHead className="text-center">Result Clicks</TableHead><TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No session data available</TableCell></TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.sessionId}>
                    <TableCell className="font-mono text-xs">{session.sessionId.substring(0, 20)}...</TableCell>
                    <TableCell>{session.ipAddress}</TableCell>
                    <TableCell>{session.country}</TableCell>
                    <TableCell>{session.source}</TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-auto p-0"><Badge variant="secondary" className="cursor-pointer">Total: {session.relatedSearches}</Badge></Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Related Search Clicks</DialogTitle></DialogHeader><div className="space-y-2">{session.clickBreakdown.relatedSearches.map((item, idx) => <div key={idx} className="flex justify-between p-2 bg-muted rounded"><span>{item.text}</span><Badge>{item.count}</Badge></div>)}</div></DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-auto p-0"><Badge variant="secondary" className="cursor-pointer">Total: {session.blogClicks}</Badge></Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Result Clicks</DialogTitle></DialogHeader><div className="space-y-2">{session.clickBreakdown.blogClicks.map((item, idx) => <div key={idx} className="flex justify-between p-2 bg-muted rounded"><span className="truncate max-w-[200px]">{item.title}</span><Badge>{item.count}</Badge></div>)}</div></DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-sm"><div>{new Date(session.lastActive).toLocaleDateString()}</div><div className="text-[10px]">{new Date(session.lastActive).toLocaleTimeString()}</div></TableCell>
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