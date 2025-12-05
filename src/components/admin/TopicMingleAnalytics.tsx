import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, RefreshCw, Search, MousePointer, Users, Globe, Mail, Monitor, Smartphone, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ClickBreakdown {
  name: string;
  total: number;
  unique: number;
  visitNowClicks: number;
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
  relatedSearches: ClickBreakdown[];
  resultClicks: ClickBreakdown[];
  timeSpent: string;
  timestamp: string;
}

export function TopicMingleAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRelatedSearches, setExpandedRelatedSearches] = useState<Set<string>>(new Set());
  const [expandedResultClicks, setExpandedResultClicks] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ totalClicks: 0, uniqueSessions: 0, webResults: 0, emailSubmissions: 0 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [sessionData, pageViews, clicks, webResultsData, emailsData] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('page_views').select('*'),
        supabase.from('clicks').select('*'),
        supabase.from('web_results').select('*').eq('site_name', 'topicmingle'),
        supabase.from('email_captures').select('*'),
      ]);

      const sessionsArr = sessionData.data || [];
      const pageViewsArr = pageViews.data || [];
      const clicksArr = clicks.data || [];

      setStats({
        totalClicks: clicksArr.length,
        uniqueSessions: sessionsArr.length,
        webResults: webResultsData.data?.length || 0,
        emailSubmissions: emailsData.data?.length || 0,
      });

      const sessionMap = new Map<string, SessionData>();
      sessionsArr.forEach((session: any) => {
        const createdAt = new Date(session.created_at);
        const lastActive = new Date(session.last_active);
        const diffMs = lastActive.getTime() - createdAt.getTime();
        sessionMap.set(session.session_id, {
          sessionId: session.session_id,
          ipAddress: session.ip_address || 'Unknown',
          country: session.country || 'Unknown',
          source: session.source || 'direct',
          device: session.user_agent?.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop',
          pageViews: 0, totalClicks: 0, uniqueClicks: 0,
          relatedSearches: [], resultClicks: [],
          timeSpent: `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`,
          timestamp: createdAt.toISOString(),
        });
      });

      pageViewsArr.forEach((view: any) => {
        const session = sessionMap.get(view.session_id);
        if (session) session.pageViews++;
      });

      const sessionClickIds = new Map<string, Set<string>>();
      const relatedSearchMap = new Map<string, Map<string, { total: number; unique: Set<string>; visitNow: number }>>();
      const resultClickMap = new Map<string, Map<string, { total: number; unique: Set<string>; visitNow: number }>>();

      clicksArr.forEach((click: any) => {
        const session = sessionMap.get(click.session_id);
        if (session) {
          session.totalClicks++;
          if (!sessionClickIds.has(click.session_id)) sessionClickIds.set(click.session_id, new Set());
          sessionClickIds.get(click.session_id)!.add(click.button_id);
          const buttonId = click.button_id || '';
          const buttonLabel = click.button_label || buttonId;
          if (buttonId.includes('search')) {
            if (!relatedSearchMap.has(click.session_id)) relatedSearchMap.set(click.session_id, new Map());
            const searchMap = relatedSearchMap.get(click.session_id)!;
            const searchName = buttonLabel || buttonId;
            if (!searchMap.has(searchName)) searchMap.set(searchName, { total: 0, unique: new Set(), visitNow: 0 });
            const data = searchMap.get(searchName)!;
            data.total++; data.unique.add(buttonId);
          } else if (buttonId.includes('blog') || buttonId.includes('result')) {
            if (!resultClickMap.has(click.session_id)) resultClickMap.set(click.session_id, new Map());
            const resultMap = resultClickMap.get(click.session_id)!;
            const resultName = buttonLabel || buttonId;
            if (!resultMap.has(resultName)) resultMap.set(resultName, { total: 0, unique: new Set(), visitNow: 0 });
            resultMap.get(resultName)!.total++;
          }
        }
      });

      sessionClickIds.forEach((buttonIds, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) session.uniqueClicks = buttonIds.size;
      });
      relatedSearchMap.forEach((searchMap, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) session.relatedSearches = Array.from(searchMap.entries()).map(([name, data]) => ({ name, total: data.total, unique: data.unique.size, visitNowClicks: data.visitNow }));
      });
      resultClickMap.forEach((resultMap, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) session.resultClicks = Array.from(resultMap.entries()).map(([name, data]) => ({ name, total: data.total, unique: data.unique.size, visitNowClicks: data.visitNow }));
      });

      setSessions(Array.from(sessionMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleRelatedSearches = (sessionId: string) => setExpandedRelatedSearches(prev => { const newSet = new Set(prev); newSet.has(sessionId) ? newSet.delete(sessionId) : newSet.add(sessionId); return newSet; });
  const toggleResultClicks = (sessionId: string) => setExpandedResultClicks(prev => { const newSet = new Set(prev); newSet.has(sessionId) ? newSet.delete(sessionId) : newSet.add(sessionId); return newSet; });

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) || s.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (!startDate && !endDate) return true;
    const sessionDate = new Date(s.timestamp);
    if (startDate && new Date(startDate) > sessionDate) return false;
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); if (end < sessionDate) return false; }
    return true;
  });

  if (loading) return <div className="flex justify-center items-center p-8"><RefreshCw className="h-6 w-6 animate-spin mr-2" />Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Clicks</CardTitle><MousePointer className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalClicks}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Unique Sessions</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.uniqueSessions}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Web Results</CardTitle><Globe className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.webResults}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Email Submissions</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.emailSubmissions}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Filter by Date:</span></div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={fetchAnalytics} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Session Analytics ({filteredSessions.length} sessions)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead><TableHead>IP Address</TableHead><TableHead>Country</TableHead><TableHead>Source</TableHead><TableHead>Device</TableHead>
                <TableHead className="text-center">Page Views</TableHead><TableHead className="text-center">Clicks</TableHead><TableHead>Related Searches</TableHead><TableHead>Result Clicks</TableHead><TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.sessionId} className="align-top">
                  <TableCell className="font-mono text-xs">{session.sessionId.slice(0, 12)}...</TableCell>
                  <TableCell className="text-sm">{session.ipAddress}</TableCell>
                  <TableCell className="text-sm">{session.country}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-emerald-600 text-white text-xs">{session.source}</Badge></TableCell>
                  <TableCell className="text-sm flex items-center gap-1">{session.device === 'Mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}{session.device}</TableCell>
                  <TableCell className="text-center">{session.pageViews}</TableCell>
                  <TableCell className="text-center">{session.totalClicks}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.relatedSearches.reduce((sum, s) => sum + s.total, 0)}</Badge>
                    {session.relatedSearches.length > 0 && <button onClick={() => toggleRelatedSearches(session.sessionId)} className="flex items-center gap-1 text-xs text-primary">{expandedRelatedSearches.has(session.sessionId) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Details</button>}
                    {expandedRelatedSearches.has(session.sessionId) && <div className="mt-2 bg-muted/50 p-2 rounded text-xs">{session.relatedSearches.map((item, idx) => <div key={idx}>{item.name}: {item.total}</div>)}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.resultClicks.reduce((sum, s) => sum + s.total, 0)}</Badge>
                    {session.resultClicks.length > 0 && <button onClick={() => toggleResultClicks(session.sessionId)} className="flex items-center gap-1 text-xs text-primary">{expandedResultClicks.has(session.sessionId) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Details</button>}
                    {expandedResultClicks.has(session.sessionId) && <div className="mt-2 bg-muted/50 p-2 rounded text-xs">{session.resultClicks.map((item, idx) => <div key={idx}>{item.name}: {item.total}</div>)}</div>}
                  </TableCell>
                  <TableCell className="text-xs"><div>{new Date(session.timestamp).toLocaleDateString()}</div><div className="text-[10px]">{new Date(session.timestamp).toLocaleTimeString()}</div></TableCell>
                </TableRow>
              ))}
              {filteredSessions.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No sessions found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}