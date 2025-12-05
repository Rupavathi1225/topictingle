import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, RefreshCw, Search, MousePointer, Users, Globe, Mail, Monitor, Smartphone } from 'lucide-react';
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        sessionMap.set(session.session_id, {
          sessionId: session.session_id,
          ipAddress: session.ip_address || 'Unknown',
          country: session.country || 'Unknown',
          source: session.source || 'direct',
          device: session.user_agent?.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop',
          pageViews: 0,
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearches: [],
          resultClicks: [],
          timeSpent: `${diffMins}m ${diffSecs}s`,
          timestamp: createdAt.toLocaleString(),
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
          
          if (!sessionClickIds.has(click.session_id)) {
            sessionClickIds.set(click.session_id, new Set());
          }
          sessionClickIds.get(click.session_id)!.add(click.button_id);

          const buttonId = click.button_id || '';
          const buttonLabel = click.button_label || buttonId;

          if (buttonId.startsWith('related-search-') || buttonId.includes('search')) {
            const searchName = buttonLabel || buttonId.replace('related-search-', '');
            
            if (!relatedSearchMap.has(click.session_id)) {
              relatedSearchMap.set(click.session_id, new Map());
            }
            const searchMap = relatedSearchMap.get(click.session_id)!;
            
            if (!searchMap.has(searchName)) {
              searchMap.set(searchName, { total: 0, unique: new Set(), visitNow: 0 });
            }
            const data = searchMap.get(searchName)!;
            data.total++;
            data.unique.add(buttonId);
            if (buttonId.includes('visit') || buttonLabel?.toLowerCase().includes('visit')) {
              data.visitNow++;
            }
          }
          else if (buttonId.startsWith('blog-card-') || buttonId.includes('blog') || buttonId.includes('result') || buttonId.includes('web-result')) {
            const resultName = buttonLabel || buttonId;
            
            if (!resultClickMap.has(click.session_id)) {
              resultClickMap.set(click.session_id, new Map());
            }
            const resultMap = resultClickMap.get(click.session_id)!;
            
            if (!resultMap.has(resultName)) {
              resultMap.set(resultName, { total: 0, unique: new Set(), visitNow: 0 });
            }
            const data = resultMap.get(resultName)!;
            data.total++;
            data.unique.add(buttonId);
          }
        }
      });

      sessionClickIds.forEach((buttonIds, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) session.uniqueClicks = buttonIds.size;
      });

      relatedSearchMap.forEach((searchMap, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.relatedSearches = Array.from(searchMap.entries()).map(([name, data]) => ({
            name,
            total: data.total,
            unique: data.unique.size,
            visitNowClicks: data.visitNow,
          }));
        }
      });

      resultClickMap.forEach((resultMap, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.resultClicks = Array.from(resultMap.entries()).map(([name, data]) => ({
            name,
            total: data.total,
            unique: data.unique.size,
            visitNowClicks: data.visitNow,
          }));
        }
      });

      // Sort by timestamp (newest first)
      const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setSessions(sortedSessions);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleRelatedSearches = (sessionId: string) => {
    setExpandedRelatedSearches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  const toggleResultClicks = (sessionId: string) => {
    setExpandedResultClicks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  const filteredSessions = sessions.filter(s =>
    s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelatedSearchTotal = (session: SessionData) => session.relatedSearches.reduce((sum, s) => sum + s.total, 0);
  const getResultClickTotal = (session: SessionData) => session.resultClicks.reduce((sum, s) => sum + s.total, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Web Results</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.webResults}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Submissions</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Analytics</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Session ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-center">Page Views</TableHead>
                <TableHead className="text-center">Total Clicks</TableHead>
                <TableHead className="text-center">Unique Clicks</TableHead>
                <TableHead className="min-w-[150px]">Related Searches</TableHead>
                <TableHead className="min-w-[150px]">Result Clicks</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => {
                const relatedTotal = getRelatedSearchTotal(session);
                const resultTotal = getResultClickTotal(session);
                const isRelatedExpanded = expandedRelatedSearches.has(session.sessionId);
                const isResultExpanded = expandedResultClicks.has(session.sessionId);

                return (
                  <TableRow key={session.sessionId} className="align-top">
                    <TableCell className="font-mono text-xs">{session.sessionId.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm">{session.ipAddress}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1">
                        {session.country !== 'Unknown' && session.country !== 'WW' && (
                          <img 
                            src={`https://flagcdn.com/16x12/${session.country.toLowerCase()}.png`}
                            alt={session.country}
                            className="w-4 h-3"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        {session.country}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-600 text-white text-xs">{session.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm flex items-center gap-1">
                      {session.device === 'Mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      {session.device}
                    </TableCell>
                    <TableCell className="text-center">{session.pageViews}</TableCell>
                    <TableCell className="text-center">{session.totalClicks}</TableCell>
                    <TableCell className="text-center text-primary">{session.uniqueClicks}</TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant="outline" className={`${relatedTotal > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-muted'}`}>
                          Total: {relatedTotal}
                        </Badge>
                        {session.relatedSearches.length > 0 && (
                          <div>
                            <button onClick={() => toggleRelatedSearches(session.sessionId)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              {isRelatedExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isRelatedExpanded ? 'Hide breakdown' : 'View breakdown'}
                            </button>
                            {isRelatedExpanded && (
                              <div className="mt-2 space-y-2 bg-muted/50 p-2 rounded text-xs">
                                {session.relatedSearches.map((item, idx) => (
                                  <div key={idx} className="border-b border-border pb-2 last:border-0">
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-muted-foreground">Total: {item.total} | Unique: {item.unique}</p>
                                    <p className="text-muted-foreground">Visit Now Button: Clicked {item.visitNowClicks}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant="outline" className={`${resultTotal > 0 ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-muted'}`}>
                          Total: {resultTotal}
                        </Badge>
                        {session.resultClicks.length > 0 && (
                          <div>
                            <button onClick={() => toggleResultClicks(session.sessionId)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              {isResultExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isResultExpanded ? 'Hide breakdown' : 'View breakdown'}
                            </button>
                            {isResultExpanded && (
                              <div className="mt-2 space-y-2 bg-muted/50 p-2 rounded text-xs">
                                {session.resultClicks.map((item, idx) => (
                                  <div key={idx} className="border-b border-border pb-2 last:border-0">
                                    <p className="font-semibold truncate max-w-[200px]">{item.name}</p>
                                    <p className="text-muted-foreground">Total: {item.total} | Unique: {item.unique}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm">{session.timeSpent}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div>
                        <div>{new Date(session.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px]">{new Date(session.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">No session data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}