import { useEffect, useState } from "react";
import { offerGrabZoneClient } from "@/integrations/offergrabzone/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Eye, MousePointer, Search, Link, Globe, Monitor, Smartphone, ChevronDown, ChevronUp } from "lucide-react";

interface Session {
  id: string;
  session_id: string;
  ip_address: string | null;
  country: string;
  country_code: string;
  source: string;
  device: string;
  page_views: number;
  first_seen: string;
  last_active: string;
}

interface Click {
  id: string;
  session_id: string;
  click_type: string;
  item_id: string | null;
  item_name: string | null;
  page: string | null;
  clicked_at: string;
}

interface SessionWithClicks extends Session {
  totalClicks: number;
  relatedSearchClicks: number;
  webResultClicks: number;
  clickBreakdown: Click[];
}

interface Stats {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  relatedSearchClicks: number;
  webResultClicks: number;
}

export const OfferGrabZoneAnalytics = () => {
  const [sessions, setSessions] = useState<SessionWithClicks[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    totalPageViews: 0,
    totalClicks: 0,
    relatedSearchClicks: 0,
    webResultClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const [sessionsRes, clicksRes] = await Promise.all([
      offerGrabZoneClient.from('sessions').select('*').order('last_active', { ascending: false }),
      offerGrabZoneClient.from('clicks').select('*').order('clicked_at', { ascending: false })
    ]);

    const allClicks = clicksRes.data || [];
    const allSessions = sessionsRes.data || [];

    // Map sessions with their click data
    const sessionsWithClicks: SessionWithClicks[] = allSessions.map(session => {
      const sessionClicks = allClicks.filter(c => c.session_id === session.session_id);
      return {
        ...session,
        totalClicks: sessionClicks.length,
        relatedSearchClicks: sessionClicks.filter(c => c.click_type === 'related_search').length,
        webResultClicks: sessionClicks.filter(c => c.click_type === 'web_result').length,
        clickBreakdown: sessionClicks
      };
    });

    setSessions(sessionsWithClicks);

    // Calculate stats
    const totalPageViews = allSessions.reduce((sum, s) => sum + s.page_views, 0);
    const relatedSearchClicks = allClicks.filter(c => c.click_type === 'related_search').length;
    const webResultClicks = allClicks.filter(c => c.click_type === 'web_result').length;

    setStats({
      totalSessions: allSessions.length,
      totalPageViews,
      totalClicks: allClicks.length,
      relatedSearchClicks,
      webResultClicks
    });

    setLoading(false);
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode === 'XX') return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-zinc-400">Loading OfferGrabZone Analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-zinc-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                <p className="text-sm text-zinc-500">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalPageViews}</p>
                <p className="text-sm text-zinc-500">Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MousePointer className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalClicks}</p>
                <p className="text-sm text-zinc-500">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.relatedSearchClicks}</p>
                <p className="text-sm text-zinc-500">Search Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Link className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.webResultClicks}</p>
                <p className="text-sm text-zinc-500">Result Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="bg-amber-500/10 border-b border-zinc-800">
          <CardTitle className="text-amber-400">Session Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="text-left p-3 text-zinc-400 font-medium">Session ID</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">IP Address</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Country</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Source</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Device</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Page Views</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Clicks</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Related Searches</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Result Clicks</th>
                  <th className="text-left p-3 text-zinc-400 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <>
                    <tr key={session.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="p-3 text-white font-mono text-sm">{session.session_id.slice(0, 12)}...</td>
                      <td className="p-3 text-zinc-300">{session.ip_address || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {getCountryFlag(session.country_code)} {session.country || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-cyan-600 text-white">{session.source}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-zinc-300">
                          {session.device === 'mobile' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                          {session.device}
                        </div>
                      </td>
                      <td className="p-3 text-white font-medium">{session.page_views}</td>
                      <td className="p-3 text-white font-medium">{session.totalClicks}</td>
                      <td className="p-3">
                        {session.relatedSearchClicks > 0 ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge className="bg-cyan-500 text-white">Total: {session.relatedSearchClicks}</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 text-xs p-0 h-auto"
                              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                            >
                              {expandedSession === session.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                              View breakdown
                            </Button>
                            <span className="text-zinc-500 text-xs">Unique: {session.relatedSearchClicks}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {session.webResultClicks > 0 ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge className="bg-amber-500 text-white">Total: {session.webResultClicks}</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-amber-400 text-xs p-0 h-auto"
                              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                            >
                              {expandedSession === session.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                              View breakdown
                            </Button>
                            <span className="text-zinc-500 text-xs">Unique: {session.webResultClicks}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-400 text-sm">
                        {new Date(session.last_active).toLocaleString()}
                      </td>
                    </tr>
                    {expandedSession === session.id && session.clickBreakdown.length > 0 && (
                      <tr key={`${session.id}-breakdown`}>
                        <td colSpan={10} className="bg-zinc-950 p-4">
                          <div className="text-sm text-zinc-400 mb-2">Click Breakdown:</div>
                          <div className="space-y-2">
                            {session.clickBreakdown.map((click) => (
                              <div key={click.id} className="flex items-center gap-4 p-2 bg-zinc-900 rounded border border-zinc-800">
                                <Badge className={click.click_type === 'related_search' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'}>
                                  {click.click_type === 'related_search' ? 'Related Search' : 'Web Result'}
                                </Badge>
                                <span className="text-white">{click.item_name || 'Unknown'}</span>
                                <span className="text-zinc-500 text-sm ml-auto">
                                  {new Date(click.clicked_at).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
