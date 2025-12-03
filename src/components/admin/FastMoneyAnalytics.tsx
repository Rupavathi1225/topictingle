import { useEffect, useState } from "react";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefreshCw, Search, MousePointer, Users, Mail, ChevronDown, ChevronUp, Globe, Monitor, Smartphone } from "lucide-react";

interface SessionAnalytics {
  session_id: string;
  ip_address: string;
  country: string;
  device_type: string;
  pageViews: number;
  totalClicks: number;
  relatedSearchClicks: { name: string; count: number }[];
  webResultClicks: { name: string; count: number }[];
}

interface WebResult {
  id: string;
  title: string;
}

interface RelatedSearch {
  id: string;
  title: string;
}

export const FastMoneyAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueSessions, setUniqueSessions] = useState(0);
  const [webResultCount, setWebResultCount] = useState(0);
  const [emailSubmissions, setEmailSubmissions] = useState(0);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);

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

      setRelatedSearches(searches);
      setWebResults(results);
      setTotalClicks(clicks.length);
      setUniqueSessions(sessions.length);
      setWebResultCount(results.length);
      setEmailSubmissions(emails.length);

      // Build session analytics
      const sessionMap = new Map<string, SessionAnalytics>();

      for (const session of sessions) {
        sessionMap.set(session.session_id, {
          session_id: session.session_id,
          ip_address: session.ip_address || "Unknown",
          country: session.country || "Unknown",
          device_type: session.device_type || "Unknown",
          pageViews: 1,
          totalClicks: 0,
          relatedSearchClicks: [],
          webResultClicks: [],
        });
      }

      // Count clicks per session
      for (const click of clicks) {
        const sessionData = sessionMap.get(click.session_id);
        if (sessionData) {
          sessionData.totalClicks += 1;

          if (click.related_search_id) {
            const rs = searches.find((s: any) => s.id === click.related_search_id);
            const name = rs?.title || "Unknown Search";
            const existing = sessionData.relatedSearchClicks.find(r => r.name === name);
            if (existing) existing.count += 1;
            else sessionData.relatedSearchClicks.push({ name, count: 1 });
          }

          if (click.web_result_id) {
            const wr = results.find((r: any) => r.id === click.web_result_id);
            const name = wr?.title || "Unknown Result";
            const existing = sessionData.webResultClicks.find(r => r.name === name);
            if (existing) existing.count += 1;
            else sessionData.webResultClicks.push({ name, count: 1 });
          }
        }
      }

      setSessionAnalytics(Array.from(sessionMap.values()));
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessionAnalytics.filter(
    (s) =>
      s.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDeviceIcon = (device: string) => {
    if (device?.toLowerCase().includes("mobile")) return <Smartphone className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Web Results</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webResultCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Submissions</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details ({filteredSessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredSessions.map((session) => (
            <Collapsible
              key={session.session_id}
              open={expandedSession === session.session_id}
              onOpenChange={() =>
                setExpandedSession(expandedSession === session.session_id ? null : session.session_id)
              }
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    {getDeviceIcon(session.device_type)}
                    <div>
                      <p className="font-medium text-sm">{session.session_id.slice(0, 16)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {session.ip_address} • {session.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{session.totalClicks} clicks</p>
                    </div>
                    {expandedSession === session.session_id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border border-t-0 rounded-b bg-muted/20 space-y-4">
                  {session.relatedSearchClicks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Related Search Clicks</h4>
                      <div className="space-y-1">
                        {session.relatedSearchClicks.map((rs, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{rs.name}</span>
                            <span className="text-muted-foreground">{rs.count} clicks</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {session.webResultClicks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Web Result Clicks</h4>
                      <div className="space-y-1">
                        {session.webResultClicks.map((wr, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{wr.name}</span>
                            <span className="text-muted-foreground">{wr.count} clicks</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {session.relatedSearchClicks.length === 0 && session.webResultClicks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No click details available</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
          {filteredSessions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No sessions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
