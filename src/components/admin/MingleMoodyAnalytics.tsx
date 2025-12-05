import { useEffect, useState } from "react";
import { mingleMoodyClient } from "@/integrations/minglemoody/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Eye, MousePointer, Search, Link, Monitor, Smartphone, ChevronDown, ChevronUp } from "lucide-react";

interface Session {
  id: string;
  session_id: string;
  ip_address: string | null;
  country: string | null;
  device_type: string | null;
  user_agent: string | null;
  source: string | null;
  created_at: string | null;
  last_activity: string | null;
}

interface ClickTracking {
  id: string;
  session_id: string;
  link_id: string | null;
  related_search_id: string | null;
  click_type: string;
  ip_address: string | null;
  country: string | null;
  device_type: string | null;
  timestamp: string | null;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string | null;
  web_result_page: number;
  position: number;
  is_active: boolean;
}

interface SessionWithClicks extends Session {
  totalClicks: number;
  relatedSearchClicks: number;
  webResultClicks: number;
  clickBreakdown: ClickTracking[];
}

interface Stats {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  relatedSearchClicks: number;
  webResultClicks: number;
}

interface RelatedSearchStats {
  id: string;
  search_text: string;
  clickCount: number;
}

export const MingleMoodyAnalytics = () => {
  const [sessions, setSessions] = useState<SessionWithClicks[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    totalPageViews: 0,
    totalClicks: 0,
    relatedSearchClicks: 0,
    webResultClicks: 0
  });
  const [relatedSearchStats, setRelatedSearchStats] = useState<RelatedSearchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showSearchBreakdown, setShowSearchBreakdown] = useState(false);
  const [clickDetails, setClickDetails] = useState<ClickTracking[]>([]);
  const [selectedSearchName, setSelectedSearchName] = useState("");
  const [allClicksData, setAllClicksData] = useState<ClickTracking[]>([]);
  const [showTotalClicksBreakdown, setShowTotalClicksBreakdown] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const [sessionsRes, clicksRes, relatedSearchesRes] = await Promise.all([
      mingleMoodyClient.from('sessions').select('*').order('last_activity', { ascending: false }),
      mingleMoodyClient.from('click_tracking').select('*').order('timestamp', { ascending: false }),
      mingleMoodyClient.from('related_searches').select('*')
    ]);

    const allClicks = clicksRes.data || [];
    const allSessions = sessionsRes.data || [];
    const allRelatedSearches = relatedSearchesRes.data || [];

    // Map sessions with their click data
    const sessionsWithClicks: SessionWithClicks[] = allSessions.map(session => {
      const sessionClicks = allClicks.filter(c => c.session_id === session.session_id);
      return {
        ...session,
        totalClicks: sessionClicks.length,
        relatedSearchClicks: sessionClicks.filter(c => c.click_type === 'related_search').length,
        webResultClicks: sessionClicks.filter(c => c.click_type === 'web_result' || c.click_type === 'link').length,
        clickBreakdown: sessionClicks
      };
    });

    setSessions(sessionsWithClicks);

    // Calculate stats - page views = total sessions (each session = 1 page view minimum)
    const totalPageViews = allSessions.length;
    const relatedSearchClicks = allClicks.filter(c => c.click_type === 'related_search').length;
    const webResultClicks = allClicks.filter(c => c.click_type === 'web_result' || c.click_type === 'link').length;

    setStats({
      totalSessions: allSessions.length,
      totalPageViews,
      totalClicks: allClicks.length,
      relatedSearchClicks,
      webResultClicks
    });

    // Store all clicks for breakdown
    setAllClicksData(allClicks);

    // Calculate related search stats
    const searchStats: RelatedSearchStats[] = allRelatedSearches.map(search => {
      const clickCount = allClicks.filter(c => c.related_search_id === search.id).length;
      return {
        id: search.id,
        search_text: search.search_text || search.title || 'Unknown',
        clickCount
      };
    }).sort((a, b) => b.clickCount - a.clickCount);

    setRelatedSearchStats(searchStats);
    setLoading(false);
  };

  const getCountryFlag = (country: string | null) => {
    if (!country) return '🌍';
    const countryCodes: { [key: string]: string } = {
      'United States': 'US', 'India': 'IN', 'Brazil': 'BR', 'Unknown': 'XX',
      'UK': 'GB', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU'
    };
    const code = countryCodes[country] || country.slice(0, 2).toUpperCase();
    if (code === 'XX' || code.length !== 2) return '🌍';
    const codePoints = code.split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const handleViewSearchBreakdown = async (search: RelatedSearchStats) => {
    const { data } = await mingleMoodyClient
      .from('click_tracking')
      .select('*')
      .eq('related_search_id', search.id)
      .order('timestamp', { ascending: false });
    
    setClickDetails(data || []);
    setSelectedSearchName(search.search_text);
    setShowSearchBreakdown(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading MingleMoody Analytics...</div>
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
              <Users className="w-8 h-8 text-cyan-400" />
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
              <Eye className="w-8 h-8 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalPageViews}</p>
                <p className="text-sm text-zinc-500">Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800/70 transition-colors" onClick={() => setShowTotalClicksBreakdown(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MousePointer className="w-8 h-8 text-cyan-300" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalClicks}</p>
                <p className="text-sm text-zinc-500">Total Clicks</p>
                <p className="text-xs text-cyan-400">View Breakdown →</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-cyan-400" />
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
              <Link className="w-8 h-8 text-cyan-600" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.webResultClicks}</p>
                <p className="text-sm text-zinc-500">Result Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related Searches Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="bg-cyan-500/10 border-b border-zinc-800">
          <CardTitle className="text-cyan-400">Related Searches Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Search Text</TableHead>
                <TableHead className="text-zinc-400">Total Clicks</TableHead>
                <TableHead className="text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedSearchStats.map((search) => (
                <TableRow key={search.id} className="border-zinc-800">
                  <TableCell className="text-white font-medium">{search.search_text}</TableCell>
                  <TableCell>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {search.clickCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleViewSearchBreakdown(search)}>
                      <Eye className="h-4 w-4 mr-1" /> View Breakdown
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {relatedSearchStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-zinc-500">No related searches found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="bg-cyan-500/10 border-b border-zinc-800">
          <CardTitle className="text-cyan-400">Session Analytics</CardTitle>
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
                          {getCountryFlag(session.country)} {session.country || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-cyan-600 text-white">{session.source || 'direct'}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-zinc-300">
                          {session.device_type === 'mobile' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                          {session.device_type || 'desktop'}
                        </div>
                      </td>
                      <td className="p-3 text-white font-medium">1</td>
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
                            <Badge className="bg-cyan-700 text-white">Total: {session.webResultClicks}</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 text-xs p-0 h-auto"
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
                        {session.last_activity ? new Date(session.last_activity).toLocaleString() : '-'}
                      </td>
                    </tr>
                    {expandedSession === session.id && session.clickBreakdown.length > 0 && (
                      <tr key={`${session.id}-breakdown`}>
                        <td colSpan={10} className="bg-zinc-950 p-4">
                          <div className="text-sm text-cyan-400 mb-2">Click Breakdown:</div>
                          <div className="space-y-2">
                            {session.clickBreakdown.map((click) => (
                              <div key={click.id} className="flex items-center gap-4 p-2 bg-zinc-900 rounded border border-zinc-800">
                                <Badge className={click.click_type === 'related_search' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-700/20 text-cyan-300'}>
                                  {click.click_type === 'related_search' ? 'Related Search' : 'Web Result'}
                                </Badge>
                                <span className="text-zinc-400 text-sm">IP: {click.ip_address || 'Unknown'}</span>
                                <span className="text-zinc-400 text-sm">Country: {click.country || 'Unknown'}</span>
                                <span className="text-zinc-500 text-sm ml-auto">
                                  {click.timestamp ? new Date(click.timestamp).toLocaleString() : '-'}
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

      {/* Search Breakdown Dialog */}
      <Dialog open={showSearchBreakdown} onOpenChange={setShowSearchBreakdown}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Search Breakdown: {selectedSearchName}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 mb-4">
            <p className="text-sm text-zinc-400">Total Clicks: <span className="text-white font-bold">{clickDetails.length}</span></p>
            <p className="text-sm text-zinc-400">Unique IPs: <span className="text-white font-bold">{new Set(clickDetails.map(c => c.ip_address).filter(Boolean)).size}</span></p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">IP Address</TableHead>
                <TableHead className="text-zinc-400">Country</TableHead>
                <TableHead className="text-zinc-400">Device</TableHead>
                <TableHead className="text-zinc-400">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clickDetails.map((click) => (
                <TableRow key={click.id} className="border-zinc-800">
                  <TableCell className="text-white">{click.ip_address || '-'}</TableCell>
                  <TableCell className="text-white">{click.country || '-'}</TableCell>
                  <TableCell className="text-white">{click.device_type || '-'}</TableCell>
                  <TableCell className="text-zinc-400">{click.timestamp ? new Date(click.timestamp).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))}
              {clickDetails.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500">No clicks recorded</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Total Clicks Breakdown Dialog */}
      <Dialog open={showTotalClicksBreakdown} onOpenChange={setShowTotalClicksBreakdown}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Total Clicks Breakdown</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 mb-4">
            <p className="text-sm text-zinc-400">Total Clicks: <span className="text-white font-bold">{allClicksData.length}</span></p>
            <p className="text-sm text-zinc-400">Unique IPs: <span className="text-white font-bold">{new Set(allClicksData.map(c => c.ip_address).filter(Boolean)).size}</span></p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Click Type</TableHead>
                <TableHead className="text-zinc-400">IP Address</TableHead>
                <TableHead className="text-zinc-400">Country</TableHead>
                <TableHead className="text-zinc-400">Device</TableHead>
                <TableHead className="text-zinc-400">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allClicksData.map((click) => (
                <TableRow key={click.id} className="border-zinc-800">
                  <TableCell>
                    <Badge className={click.click_type === 'related_search' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-700/20 text-cyan-300'}>
                      {click.click_type === 'related_search' ? 'Search' : 'Result'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white">{click.ip_address || '-'}</TableCell>
                  <TableCell className="text-white">{click.country || '-'}</TableCell>
                  <TableCell className="text-white">{click.device_type || '-'}</TableCell>
                  <TableCell className="text-zinc-400">{click.timestamp ? new Date(click.timestamp).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))}
              {allClicksData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500">No clicks recorded</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};
