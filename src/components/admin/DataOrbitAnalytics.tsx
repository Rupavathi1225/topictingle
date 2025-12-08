import { useEffect, useState } from "react";
import { dataOrbitClient } from "@/integrations/dataorbit/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, MousePointer, FileText } from "lucide-react";

interface Event {
  id: string;
  session_id: string;
  event_type: string;
  ip_address: string | null;
  device: string | null;
  country: string | null;
  page_url: string | null;
  created_at: string;
  blog_id: string | null;
  related_search_id: string | null;
  web_result_id: string | null;
  blogs?: { title: string } | null;
  related_searches?: { title: string } | null;
  web_results?: { title: string } | null;
}

interface BreakdownItem {
  name: string;
  total_clicks: number;
  unique_clicks: number;
}

export function DataOrbitAnalytics() {
  const [stats, setStats] = useState({
    totalSessions: 0,
    pageViews: 0,
    uniquePages: 0,
    totalClicks: 0,
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownType, setBreakdownType] = useState<'blog' | 'related_search' | 'clicks'>('blog');
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [sessionsRes, eventsRes] = await Promise.all([
        dataOrbitClient.from('tracking_sessions').select('session_id'),
        dataOrbitClient.from('tracking_events').select('*, blogs(title), related_searches(title), web_results(title)').order('created_at', { ascending: false }).limit(100),
      ]);
      
      const sessions = sessionsRes.data || [];
      const allEvents = eventsRes.data || [];
      
      const pageViews = allEvents.filter(e => e.event_type === 'page_view').length;
      const uniquePages = new Set(allEvents.filter(e => e.event_type === 'page_view').map(e => e.page_url)).size;
      const totalClicks = allEvents.filter(e => 
        e.event_type === 'blog_click' || 
        e.event_type === 'related_search_click' || 
        e.event_type === 'visit_now_click' ||
        e.event_type === 'web_result_click'
      ).length;
      
      setStats({
        totalSessions: sessions.length,
        pageViews,
        uniquePages,
        totalClicks,
      });
      
      setEvents(allEvents as Event[]);
      setLoading(false);
    };
    
    fetchData();
  }, []);

  const openBreakdown = async (type: 'blog' | 'related_search' | 'clicks') => {
    setBreakdownType(type);
    setShowBreakdown(true);
    
    if (type === 'clicks') {
      const { data: eventsData } = await dataOrbitClient
        .from('tracking_events')
        .select('event_type, ip_address')
        .in('event_type', ['blog_click', 'related_search_click', 'visit_now_click', 'web_result_click']);
      
      if (!eventsData) return;
      
      const breakdownMap = new Map<string, { total: number; uniqueIPs: Set<string> }>();
      
      eventsData.forEach(event => {
        const type = event.event_type;
        if (!breakdownMap.has(type)) {
          breakdownMap.set(type, { total: 0, uniqueIPs: new Set() });
        }
        const item = breakdownMap.get(type)!;
        item.total++;
        if (event.ip_address) item.uniqueIPs.add(event.ip_address);
      });
      
      const breakdownData: BreakdownItem[] = Array.from(breakdownMap.entries()).map(([type, data]) => ({
        name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        total_clicks: data.total,
        unique_clicks: data.uniqueIPs.size,
      })).sort((a, b) => b.total_clicks - a.total_clicks);
      
      setBreakdown(breakdownData);
      return;
    }
    
    const eventType = type === 'blog' ? 'blog_click' : 'related_search_click';
    const field = type === 'blog' ? 'blog_id' : 'related_search_id';
    
    const { data: eventsData } = await dataOrbitClient
      .from('tracking_events')
      .select(`${field}, ip_address`)
      .eq('event_type', eventType);
    
    if (!eventsData) return;
    
    const ids = [...new Set(eventsData.map(e => e[field as keyof typeof e]).filter(Boolean))];
    const tableName = type === 'blog' ? 'blogs' : 'related_searches';
    
    const { data: items } = await dataOrbitClient
      .from(tableName)
      .select('id, title')
      .in('id', ids as string[]);
    
    const itemMap = new Map((items || []).map(i => [i.id, i.title]));
    
    const breakdownMap = new Map<string, { total: number; uniqueIPs: Set<string> }>();
    
    eventsData.forEach(event => {
      const id = event[field as keyof typeof event] as string;
      if (!id) return;
      
      if (!breakdownMap.has(id)) {
        breakdownMap.set(id, { total: 0, uniqueIPs: new Set() });
      }
      
      const item = breakdownMap.get(id)!;
      item.total++;
      if (event.ip_address) item.uniqueIPs.add(event.ip_address);
    });
    
    const breakdownData: BreakdownItem[] = Array.from(breakdownMap.entries()).map(([id, data]) => ({
      name: itemMap.get(id) || id,
      total_clicks: data.total,
      unique_clicks: data.uniqueIPs.size,
    })).sort((a, b) => b.total_clicks - a.total_clicks);
    
    setBreakdown(breakdownData);
  };

  const blogClicks = events.filter(e => e.event_type === 'blog_click').length;
  const relatedSearchClicks = events.filter(e => e.event_type === 'related_search_click').length;

  const statCards = [
    { label: 'Sessions', value: stats.totalSessions, icon: Users },
    { label: 'Page Views', value: stats.pageViews, icon: Eye },
    { label: 'Unique Pages', value: stats.uniquePages, icon: FileText },
    { label: 'Total Clicks', value: stats.totalClicks, icon: MousePointer, hasBreakdown: true },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          DataOrbit Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-muted-foreground text-xs">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
                {stat.hasBreakdown && (
                  <Button variant="outline" size="sm" onClick={() => openBreakdown('clicks')}>
                    View Breakdown
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Breakdown Dialog */}
        <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {breakdownType === 'blog' ? 'Blog' : breakdownType === 'related_search' ? 'Related Search' : 'Click'} Breakdown
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-right p-3 text-sm font-medium">Total Clicks</th>
                    <th className="text-right p-3 text-sm font-medium">Unique Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3 text-sm">{item.name}</td>
                      <td className="p-3 text-sm text-right">{item.total_clicks}</td>
                      <td className="p-3 text-sm text-right">{item.unique_clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Recent Events Table */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-foreground">Session</th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">IP</th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">Device</th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">Country</th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">Page View</th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      Clicks
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openBreakdown('clicks')}>
                        View Breakdown
                      </Button>
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      Blog Clicks ({blogClicks})
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openBreakdown('blog')}>
                        View Breakdown
                      </Button>
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      Related Searches ({relatedSearchClicks})
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openBreakdown('related_search')}>
                        View Breakdown
                      </Button>
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="p-3 text-xs text-muted-foreground font-mono">{event.session_id?.slice(0, 10)}...</td>
                    <td className="p-3 text-xs text-muted-foreground">{event.ip_address || '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{event.device || '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{event.country || '-'}</td>
                    <td className="p-3 text-xs">
                      {event.event_type === 'page_view' ? (
                        <span className="text-blue-600 max-w-24 truncate block">{event.page_url || '-'}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-xs">
                      {event.event_type !== 'page_view' ? (
                        <span className={`px-2 py-1 rounded ${
                          event.event_type === 'blog_click' ? 'bg-green-500/20 text-green-600' :
                          event.event_type === 'related_search_click' ? 'bg-purple-500/20 text-purple-600' :
                          event.event_type === 'visit_now_click' ? 'bg-orange-500/20 text-orange-600' :
                          'bg-blue-500/20 text-blue-600'
                        }`}>
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {event.event_type === 'blog_click' ? event.blogs?.title || '-' : '-'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {event.event_type === 'related_search_click' ? event.related_searches?.title || '-' : '-'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DataOrbitAnalytics;
