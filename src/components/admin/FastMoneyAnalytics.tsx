import { useEffect, useState } from "react";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, MousePointer, Users, Globe, Mail, Monitor, Smartphone, ChevronDown, ChevronUp } from "lucide-react";

interface ClickBreakdown {
  name: string;
  total: number;
  unique: number;
  visitNowClicks: number;
}

interface SessionAnalytics {
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

export const FastMoneyAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRelatedSearches, setExpandedRelatedSearches] = useState<Set<string>>(new Set());
  const [expandedResultClicks, setExpandedResultClicks] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState({ totalClicks: 0, uniqueSessions: 0, webResults: 0, emailSubmissions: 0 });
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [clicksRes, sessionsRes, resultsRes, searchesRes, emailsRes] = await Promise.all([
        fastMoneyClient.from("link_tracking").select("*").order("clicked_at", { ascending: false }),
        fastMoneyClient.from("sessions").select("*").order("last_activity", { ascending: false }),
        fastMoneyClient.from("web_results").select("*"),
        fastMoneyClient.from("related_searches").select("*"),
        fastMoneyClient.from("email_submissions").select("*"),
      ]);

      const clicks = clicksRes.data || [];
      const sessions = sessionsRes.data || [];
      const results = resultsRes.data || [];
      const searches = searchesRes.data || [];
      const emails = emailsRes.data || [];

      setStats({
        totalClicks: clicks.length,
        uniqueSessions: sessions.length,
        webResults: results.length,
        emailSubmissions: emails.length,
      });

      // Build session analytics
      const sessionMap = new Map<string, SessionAnalytics>();

      for (const session of sessions) {
        const createdAt = new Date(session.created_at || session.last_activity);
        const lastActive = new Date(session.last_activity);
        const diffMs = lastActive.getTime() - createdAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        sessionMap.set(session.session_id, {
          sessionId: session.session_id,
          ipAddress: session.ip_address || "Unknown",
          country: session.country || "Unknown",
          source: session.source || "landing",
          device: session.device_type?.toLowerCase().includes("mobile") ? "Mobile" : "Desktop",
          pageViews: 1,
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearches: [],
          resultClicks: [],
          timeSpent: `${diffMins}m ${diffSecs}s`,
          timestamp: createdAt.toLocaleString(),
        });
      }

      // Process clicks
      const sessionClickIds = new Map<string, Set<string>>();
      const relatedSearchMap = new Map<string, Map<string, { total: number; unique: Set<string>; visitNow: number }>>();
      const resultClickMap = new Map<string, Map<string, { total: number; unique: Set<string>; visitNow: number }>>();

      for (const click of clicks) {
        const sessionData = sessionMap.get(click.session_id);
        if (sessionData) {
          sessionData.totalClicks += 1;

          if (!sessionClickIds.has(click.session_id)) {
            sessionClickIds.set(click.session_id, new Set());
          }
          const clickId = click.related_search_id || click.web_result_id || click.id;
          sessionClickIds.get(click.session_id)!.add(clickId);

          if (click.related_search_id) {
            const rs = searches.find((s: any) => s.id === click.related_search_id);
            const name = rs?.title || rs?.search_text || "Unknown Search";
            
            if (!relatedSearchMap.has(click.session_id)) {
              relatedSearchMap.set(click.session_id, new Map());
            }
            const searchMap = relatedSearchMap.get(click.session_id)!;
            
            if (!searchMap.has(name)) {
              searchMap.set(name, { total: 0, unique: new Set(), visitNow: 0 });
            }
            const data = searchMap.get(name)!;
            data.total++;
            data.unique.add(click.related_search_id);
            if (click.click_type?.includes('visit')) data.visitNow++;
          }

          if (click.web_result_id) {
            const wr = results.find((r: any) => r.id === click.web_result_id);
            const name = wr?.title || click.target_url || "Unknown Result";
            
            if (!resultClickMap.has(click.session_id)) {
              resultClickMap.set(click.session_id, new Map());
            }
            const resultMap = resultClickMap.get(click.session_id)!;
            
            if (!resultMap.has(name)) {
              resultMap.set(name, { total: 0, unique: new Set(), visitNow: 0 });
            }
            const data = resultMap.get(name)!;
            data.total++;
            data.unique.add(click.web_result_id);
          }
        }
      }

      // Set unique clicks and breakdown data
      sessionClickIds.forEach((clickIds, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.uniqueClicks = clickIds.size;
        }
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

      // Sort by total clicks descending
      const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => b.totalClicks - a.totalClicks);
      setSessionAnalytics(sortedSessions);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
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

  const filteredSessions = sessionAnalytics.filter(
    (s) =>
      s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelatedSearchTotal = (session: SessionAnalytics) => session.relatedSearches.reduce((sum, s) => sum + s.total, 0);
  const getResultClickTotal = (session: SessionAnalytics) => session.resultClicks.reduce((sum, s) => sum + s.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalClicks}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Unique Sessions</CardTitle>
            <Users className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.uniqueSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Web Results</CardTitle>
            <Globe className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.webResults}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Email Submissions</CardTitle>
            <Mail className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.emailSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button onClick={fetchAnalytics} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Session Analytics Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-emerald-400">Session Analytics</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="min-w-[120px] text-zinc-400">Session ID</TableHead>
                <TableHead className="text-zinc-400">IP Address</TableHead>
                <TableHead className="text-zinc-400">Country</TableHead>
                <TableHead className="text-zinc-400">Source</TableHead>
                <TableHead className="text-zinc-400">Device</TableHead>
                <TableHead className="text-center text-zinc-400">Page Views</TableHead>
                <TableHead className="text-center text-zinc-400">Total Clicks</TableHead>
                <TableHead className="text-center text-zinc-400">Unique Clicks</TableHead>
                <TableHead className="min-w-[150px] text-zinc-400">Related Searches</TableHead>
                <TableHead className="min-w-[150px] text-zinc-400">Result Clicks</TableHead>
                <TableHead className="text-zinc-400">Time Spent</TableHead>
                <TableHead className="text-zinc-400">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => {
                const relatedTotal = getRelatedSearchTotal(session);
                const resultTotal = getResultClickTotal(session);
                const isRelatedExpanded = expandedRelatedSearches.has(session.sessionId);
                const isResultExpanded = expandedResultClicks.has(session.sessionId);

                return (
                  <TableRow key={session.sessionId} className="align-top border-zinc-800 hover:bg-zinc-800/30">
                    <TableCell className="font-mono text-xs text-zinc-300">{session.sessionId.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm text-zinc-300">{session.ipAddress}</TableCell>
                    <TableCell className="text-sm text-zinc-300">{session.country}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-600 text-white text-xs">
                        {session.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm flex items-center gap-1 text-zinc-300">
                      {session.device === 'Mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      {session.device}
                    </TableCell>
                    <TableCell className="text-center text-zinc-300">{session.pageViews}</TableCell>
                    <TableCell className="text-center text-zinc-300">{session.totalClicks}</TableCell>
                    <TableCell className="text-center text-emerald-400">{session.uniqueClicks}</TableCell>
                    
                    {/* Related Searches Column */}
                    <TableCell>
                      <div className="space-y-2">
                        <Badge 
                          variant="outline" 
                          className={`${relatedTotal > 0 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}
                        >
                          Total: {relatedTotal}
                        </Badge>
                        {session.relatedSearches.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleRelatedSearches(session.sessionId)}
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                            >
                              {isRelatedExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isRelatedExpanded ? 'Hide breakdown' : 'View breakdown'}
                            </button>
                            {isRelatedExpanded && (
                              <div className="mt-2 space-y-2 bg-zinc-800/80 p-2 rounded text-xs">
                                {session.relatedSearches.map((item, idx) => (
                                  <div key={idx} className="border-b border-zinc-700 pb-2 last:border-0">
                                    <p className="font-semibold text-zinc-200">{item.name}</p>
                                    <p className="text-zinc-400">
                                      Total: {item.total} | Unique: {item.unique}
                                    </p>
                                    <p className="text-zinc-400">
                                      Visit Now Button: Clicked {item.visitNowClicks}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Result Clicks Column */}
                    <TableCell>
                      <div className="space-y-2">
                        <Badge 
                          variant="outline" 
                          className={`${resultTotal > 0 ? 'bg-cyan-900/50 text-cyan-400 border-cyan-700' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}
                        >
                          Total: {resultTotal}
                        </Badge>
                        {session.resultClicks.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleResultClicks(session.sessionId)}
                              className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                            >
                              {isResultExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isResultExpanded ? 'Hide breakdown' : 'View breakdown'}
                            </button>
                            {isResultExpanded && (
                              <div className="mt-2 space-y-2 bg-zinc-800/80 p-2 rounded text-xs">
                                {session.resultClicks.map((item, idx) => (
                                  <div key={idx} className="border-b border-zinc-700 pb-2 last:border-0">
                                    <p className="font-semibold truncate max-w-[200px] text-zinc-200">{item.name}</p>
                                    <p className="text-zinc-400">
                                      Total: {item.total} | Unique: {item.unique}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-zinc-300">{session.timeSpent}</TableCell>
                    <TableCell className="text-xs text-zinc-500">{session.timestamp}</TableCell>
                  </TableRow>
                );
              })}
              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-zinc-500 py-8">
                    No sessions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
