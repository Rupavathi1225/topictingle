import { useState, useEffect } from 'react';
// CHANGED: Reverted to aliased paths (@/) which is correct for your project
import { supabase } from '@/integrations/supabase/client';
import { dataOrbitZoneClient } from '@/integrations/dataorbitzone/client';
import { searchProjectClient } from '@/integrations/searchproject/client';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, RefreshCw, Download, ShoppingCart, Home, Palette, Search, FileText, MousePointerClick } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SiteStats {
  siteName: string;
  icon: any;
  color: string;
  sessions: number;
  pageViews: number;
  uniquePages: number;
  totalClicks: number;
  uniqueClicks: number;
}

// Updated SessionDetail interface to include blog clicks and detailed search results
interface SessionDetail {
  sessionId: string;
  siteName: string;
  siteIcon: any;
  siteColor: string;
  device: string;
  ipAddress: string;
  country: string;
  timeSpent: string;
  timestamp: string;
  pageViews: number;
  uniquePages: number;
  totalClicks: number;
  uniqueClicks: number;
  searchResults: Array<{
    term: string;
    views: number;
    totalClicks: number;
    uniqueClicks: number;
    visitNowClicks: number;
    visitNowUnique: number;
  }>;
  blogClicks: Array<{
    title: string;
    totalClicks: number;
    uniqueClicks: number;
  }>;
  buttonInteractions: Array<{
    button: string;
    total: number;
    unique: number;
  }>;
}

interface UnifiedAnalyticsProps {
  defaultSite?: string;
  hideControls?: boolean;
}

export function UnifiedAnalytics({ defaultSite = 'all', hideControls = false }: UnifiedAnalyticsProps = {}) {
  const [selectedSite, setSelectedSite] = useState<string>(defaultSite);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const sites = [
    { id: 'dataorbitzone', name: 'DataOrbitZone', icon: ShoppingCart, color: 'from-orange-500 to-orange-600' },
    { id: 'searchproject', name: 'SearchProject', icon: Home, color: 'from-pink-500 to-pink-600' },
    { id: 'tejastarin', name: 'Teja Starin', icon: FileText, color: 'from-purple-500 to-purple-600' },
    { id: 'main', name: 'TopicMingle', icon: Palette, color: 'from-cyan-500 to-cyan-600' },
  ];

  useEffect(() => {
    // Reset to default site when component mounts with a specific defaultSite
    if (defaultSite !== 'all') {
      setSelectedSite(defaultSite);
    }
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSite]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [dataOrbit, searchProj, tejaStarin, mainProj] = await Promise.all([
        fetchDataOrbitZone(),
        fetchSearchProject(),
        fetchTejaStarin(),
        fetchMainProject(),
      ]);

      const allStats: SiteStats[] = [
        { siteName: 'DataOrbitZone', icon: ShoppingCart, color: 'from-orange-500 to-orange-600', ...dataOrbit.stats },
        { siteName: 'SearchProject', icon: Home, color: 'from-pink-500 to-pink-600', ...searchProj.stats },
        { siteName: 'Teja Starin', icon: FileText, color: 'from-purple-500 to-purple-600', ...tejaStarin.stats },
        { siteName: 'TopicMingle', icon: Palette, color: 'from-cyan-500 to-cyan-600', ...mainProj.stats },
      ];

      setSiteStats(allStats);

      const allSessions = [
        ...dataOrbit.sessions,
        ...searchProj.sessions,
        ...tejaStarin.sessions,
        ...mainProj.sessions,
      ];

      // keep newest first
      setSessions(allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch & process DataOrbitZone analytics.
   * - CHANGED: Now fetches blog/search names from their respective tables to show correct labels.
   */
  const fetchDataOrbitZone = async () => {
    const { data: analytics } = await dataOrbitZoneClient
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false });

    // CHANGED: Added lookup maps for names, just like in Admin.tsx
    const relatedSearchIds = Array.from(new Set((analytics || []).map((e: any) => e.related_search_id).filter(Boolean)));
    const blogIds = Array.from(new Set((analytics || []).map((e: any) => e.blog_id).filter(Boolean)));

    const relatedSearchMap = new Map<string, string>();
    if (relatedSearchIds.length > 0) {
      const { data: rsData } = await dataOrbitZoneClient
        .from('related_searches')
        .select('id, search_text')
        .in('id', relatedSearchIds);
      rsData?.forEach((r: any) => relatedSearchMap.set(r.id, r.search_text));
    }

    const blogMap = new Map<string, string>();
    if (blogIds.length > 0) {
      const { data: bData } = await dataOrbitZoneClient
        .from('blogs')
        .select('id, title')
        .in('id', blogIds);
      bData?.forEach((b: any) => blogMap.set(b.id, b.title));
    }
    // END CHANGED

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (analytics || []).forEach((event: any) => {
      const sid = event.session_id || `anon-${event.ip_address || 'unknown'}`;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          sessionId: sid,
          device: event.device || 'Desktop • Chrome',
          ipAddress: event.ip_address || 'N/A',
          country: event.country || 'Unknown',
          timeSpent: '0s',
          timestamp: event.created_at || new Date().toISOString(),
          pageViews: 0,
          uniquePagesSet: new Set<string>(),
          totalClicks: 0,
          uniqueClicksSet: new Set<string>(),
          // CHANGED: Using new maps for breakdown
          rsBreakdownMap: new Map<string, any>(),
          blogBreakdownMap: new Map<string, any>(),
          buttonInteractionsMap: new Map<string, any>(),
        });
      }

      const session = sessionMap.get(sid);
      const eventType = (event.event_type || '').toString().toLowerCase();

      // Page Views
      if (eventType.includes('page') || eventType.includes('view')) {
        session.pageViews++;
        const pageId = event.page_url || event.url || (event.blog_id ? `blog-${event.blog_id}` : null);
        if (pageId) {
          session.uniquePagesSet.add(pageId);
          globalUniquePages.add(pageId);
        }
      }

      // Clicks
      if (eventType.includes('click') || eventType.includes('button')) {
        session.totalClicks++;
        const clickId = event.button_id || event.related_search_id || (event.blog_id ? `blog-${event.blog_id}` : null) || `click-${session.sessionId}-${session.totalClicks}`;
        if (clickId) {
          session.uniqueClicksSet.add(clickId);
          globalUniqueClicks.add(clickId);
        }

        // CHANGED: Detailed click breakdown logic
        const ip = session.ipAddress || 'unknown';
        const buttonId = event.button_id || 'unknown';
        const buttonLabel = event.button_label || 'Unknown';

        let isAssigned = false;

        // 1. Related Search Click (the term itself)
        if (event.related_search_id && buttonId.startsWith('related-search-')) { // Only count clicks on the search term
          const term = relatedSearchMap.get(event.related_search_id) || buttonLabel || 'Unknown Search';
          const entry = session.rsBreakdownMap.get(term) || { term, views: 0, totalClicks: 0, uniqueClicks: new Set(), visitNowClicks: 0, visitNowUnique: new Set() };
          entry.totalClicks++;
          entry.uniqueClicks.add(ip);
          session.rsBreakdownMap.set(term, entry);
          isAssigned = true;
        }

        // 2. "Visit Now" Button Click
        if (buttonId.startsWith('visit-now-')) {
          const term = buttonLabel; // Assuming label is the term
          const entry = session.rsBreakdownMap.get(term) || { term, views: 0, totalClicks: 0, uniqueClicks: new Set(), visitNowClicks: 0, visitNowUnique: new Set() };
          entry.visitNowClicks++;
          entry.visitNowUnique.add(ip);
          session.rsBreakdownMap.set(term, entry);
          isAssigned = true;
        }
        
        // 3. Blog Card Click
        if (event.blog_id && buttonId.startsWith('blog-card-')) { // Only count clicks on the blog card
           const title = blogMap.get(event.blog_id) || buttonLabel || 'Unknown Blog';
           const entry = session.blogBreakdownMap.get(title) || { title, totalClicks: 0, uniqueClicks: new Set() };
           entry.totalClicks++;
           entry.uniqueClicks.add(ip);
           session.blogBreakdownMap.set(title, entry);
           isAssigned = true;
        }
        
        // 4. Other Button Click (if not assigned to RS or Blog)
        if (!isAssigned && !buttonId.startsWith('related-search-')) { // Avoid double-counting
            const key = buttonLabel === 'Unknown' ? (buttonId || 'Unknown-button') : buttonLabel;
            if(key !== 'Unknown-button') { // Don't log "Unknown-button"
              const entry = session.buttonInteractionsMap.get(key) || { button: key, total: 0, unique: new Set() };
              entry.total++;
              entry.unique.add(ip);
              session.buttonInteractionsMap.set(key, entry);
            }
        }
      }
      
      // Track views for RS (if event type is view and has rs_id)
      if ((eventType.includes('view') || eventType.includes('page')) && event.related_search_id) {
          const term = relatedSearchMap.get(event.related_search_id) || event.related_search_label || 'Unknown Search';
          const entry = session.rsBreakdownMap.get(term) || { term, views: 0, totalClicks: 0, uniqueClicks: new Set(), visitNowClicks: 0, visitNowUnique: new Set() };
          entry.views++;
          session.rsBreakdownMap.set(term, entry);
      }

      // Update timestamp if newer
      if (event.created_at && new Date(event.created_at).getTime() > new Date(session.timestamp).getTime()) {
        session.timestamp = event.created_at;
      }
    });

    // Convert per-session maps/sets to arrays + counts
    const sessions = Array.from(sessionMap.values()).map((s: any) => {
      // CHANGED: Convert new maps to arrays
      const finalSearchResults = Array.from(s.rsBreakdownMap.values()).map((sr: any) => ({
        term: sr.term,
        views: sr.views,
        totalClicks: sr.totalClicks,
        uniqueClicks: sr.uniqueClicks.size,
        visitNowClicks: sr.visitNowClicks,
        visitNowUnique: sr.visitNowUnique.size,
      }));

      const finalBlogClicks = Array.from(s.blogBreakdownMap.values()).map((bc: any) => ({
        title: bc.title,
        totalClicks: bc.totalClicks,
        uniqueClicks: bc.uniqueClicks.size,
      }));

      const finalButtonInteractions = Array.from(s.buttonInteractionsMap.values()).map((bi: any) => ({
        button: bi.button,
        total: bi.total,
        unique: bi.unique.size,
      }));

      return {
        sessionId: s.sessionId,
        siteName: 'DataOrbitZone',
        siteIcon: ShoppingCart,
        siteColor: 'from-orange-500 to-orange-600',
        device: s.device,
        ipAddress: s.ipAddress,
        country: s.country,
        timeSpent: s.timeSpent,
        timestamp: s.timestamp,
        pageViews: s.pageViews,
        uniquePages: s.uniquePagesSet.size,
        totalClicks: s.totalClicks,
        uniqueClicks: s.uniqueClicksSet.size,
        searchResults: finalSearchResults,
        blogClicks: finalBlogClicks,
        buttonInteractions: finalButtonInteractions,
      };
    }) as SessionDetail[];

    const stats = {
      sessions: sessionMap.size,
      pageViews: sessions.reduce((sum: number, s: any) => sum + s.pageViews, 0),
      uniquePages: globalUniquePages.size,
      totalClicks: sessions.reduce((sum: number, s: any) => sum + s.totalClicks, 0),
      uniqueClicks: globalUniqueClicks.size,
    };

    return { stats, sessions };
  };

  /**
   * Fetch & process SearchProject analytics.
   * - Adds empty/zeroed fields to match the new SessionDetail interface.
   */
  const fetchSearchProject = async () => {
    const { data: analytics } = await searchProjectClient
      .from('analytics')
      .select('*')
      .order('timestamp', { ascending: false });

    const sessions: SessionDetail[] = (analytics || []).map((a: any) => ({
      sessionId: a.session_id || `sp-${a.id || Math.random().toString(36).slice(2, 9)}`,
      siteName: 'SearchProject',
      siteIcon: Home,
      siteColor: 'from-pink-500 to-pink-600',
      device: a.device || 'Mobile • Safari',
      ipAddress: a.ip_address || 'N/A',
      country: a.country || 'Unknown',
      timeSpent: formatTimeSpent(a.time_spent || 0),
      timestamp: a.timestamp || a.created_at || new Date().toISOString(),
      pageViews: a.page_views || 0,
      uniquePages: a.unique_pages || (a.page_urls ? new Set(a.page_urls).size : (a.unique_pages_count || 0)),
      totalClicks: a.clicks || 0,
      uniqueClicks: a.unique_clicks || (a.button_ids ? new Set(a.button_ids).size : (a.unique_clicks_count || 0)),
      searchResults: Array.isArray(a.search_results) ? a.search_results.map((sr: any) => ({
        term: sr.term,
        views: sr.views || 0,
        totalClicks: sr.totalClicks || 0,
        uniqueClicks: sr.uniqueClicks || 0,
        visitNowClicks: 0,
        visitNowUnique: 0,
      })) : [{
        term: 'results',
        views: a.related_searches || 0,
        totalClicks: a.result_clicks || 0,
        uniqueClicks: a.unique_clicks || 0,
        visitNowClicks: 0,
        visitNowUnique: 0,
      }],
      blogClicks: [],
      buttonInteractions: Array.isArray(a.button_interactions) ? a.button_interactions.map((bi: any) => ({
        button: bi.button,
        total: bi.total || 0,
        unique: bi.unique || 0,
      })) : [{ button: 'result-click', total: a.result_clicks || 0, unique: a.unique_result_clicks || 0 }],
    }));

    // build global sets if explicit arrays exist; else fallback sums
    const globalUniquePagesSet = new Set<string>();
    const globalUniqueClicksSet = new Set<string>();
    (analytics || []).forEach((a: any) => {
      if (a.page_urls && Array.isArray(a.page_urls)) a.page_urls.forEach((p: string) => globalUniquePagesSet.add(p));
      if (a.button_ids && Array.isArray(a.button_ids)) a.button_ids.forEach((b: string) => globalUniqueClicksSet.add(b));
    });

    const stats = {
      sessions: (analytics || []).length,
      pageViews: (analytics || []).reduce((sum: number, a: any) => sum + (a.page_views || 0), 0),
      uniquePages: globalUniquePagesSet.size || (sessions.reduce((sum, s) => sum + (s.uniquePages || 0), 0)),
      totalClicks: (analytics || []).reduce((sum: number, a: any) => sum + (a.clicks || 0), 0),
      uniqueClicks: globalUniqueClicksSet.size || (sessions.reduce((sum, s) => sum + (s.uniqueClicks || 0), 0)),
    };

    return { stats, sessions };
  };

  /**
   * Fetch & process Teja Starin analytics
   */
  const fetchTejaStarin = async () => {
    // Fetch email submissions as session-like data
    const { data: emailSubmissions } = await tejaStarinClient
      .from('email_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (emailSubmissions || []).forEach((submission: any) => {
      const sid = submission.session_id || submission.ip_address || `ts-${submission.id}`;
      
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          sessionId: sid,
          device: 'Desktop • Chrome',
          ipAddress: submission.ip_address || 'N/A',
          country: 'Unknown',
          timeSpent: '0s',
          timestamp: submission.created_at || new Date().toISOString(),
          pageViews: 1,
          uniquePagesSet: new Set<string>(),
          totalClicks: 1,
          uniqueClicksSet: new Set<string>(),
          searchResults: [],
          blogClicks: [],
          buttonInteractions: [],
        });
      }

      const session = sessionMap.get(sid);
      session.uniquePagesSet.add(`pre-landing-${submission.related_search_id || 'unknown'}`);
      session.uniqueClicksSet.add(`email-submit-${submission.id}`);
      globalUniquePages.add(`pre-landing-${submission.related_search_id || 'unknown'}`);
      globalUniqueClicks.add(`email-submit-${submission.id}`);
    });

    const sessions = Array.from(sessionMap.values()).map((s: any) => ({
      sessionId: s.sessionId,
      siteName: 'Teja Starin',
      siteIcon: FileText,
      siteColor: 'from-purple-500 to-purple-600',
      device: s.device,
      ipAddress: s.ipAddress,
      country: s.country,
      timeSpent: s.timeSpent,
      timestamp: s.timestamp,
      pageViews: s.pageViews,
      uniquePages: s.uniquePagesSet.size,
      totalClicks: s.totalClicks,
      uniqueClicks: s.uniqueClicksSet.size,
      searchResults: s.searchResults,
      blogClicks: s.blogClicks,
      buttonInteractions: s.buttonInteractions,
    })) as SessionDetail[];

    const stats = {
      sessions: sessionMap.size,
      pageViews: sessions.reduce((sum: number, s: any) => sum + s.pageViews, 0),
      uniquePages: globalUniquePages.size,
      totalClicks: sessions.reduce((sum: number, s: any) => sum + s.totalClicks, 0),
      uniqueClicks: globalUniqueClicks.size,
    };

    return { stats, sessions };
  };

  /**
   * Fetch & process main project (TopicMingle) data from Supabase sessions/page_views/clicks tables
   * - Now processes the 'clicks' table to find detailed blog/search/visit-now clicks.
   */
  const fetchMainProject = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: pageViews } = await supabase
      .from('page_views')
      .select('*');

    const { data: clicks } = await supabase
      .from('clicks')
      .select('*');

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (sessionsData || []).forEach((s: any) => {
      sessionMap.set(s.session_id, {
        sessionId: s.session_id,
        device: s.user_agent?.includes('Mobile') ? 'Mobile • Safari' : 'Desktop • Firefox',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.created_at || new Date().toISOString(),
        pageViews: 0,
        uniquePagesSet: new Set<string>(),
        totalClicks: 0,
        uniqueClicksSet: new Set<string>(),
        // Added maps to process detailed clicks
        rsBreakdownMap: new Map<string, any>(),
        blogBreakdownMap: new Map<string, any>(),
        buttonInteractionsMap: new Map<string, any>(),
      });
    });

    (pageViews || []).forEach((pv: any) => {
      const session = sessionMap.get(pv.session_id);
      if (session) {
        session.pageViews++;
        const pageKey = pv.page_url || pv.path || `pv-${pv.id}`;
        session.uniquePagesSet.add(pageKey);
        globalUniquePages.add(pageKey);
      }
    });

    // Detailed click processing
    (clicks || []).forEach((c: any) => {
      const session = sessionMap.get(c.session_id);
      if (session) {
        // Count total clicks
        session.totalClicks++;
        const clickKey = c.button_id || c.button_label || `click-${c.id}`;
        session.uniqueClicksSet.add(clickKey);
        globalUniqueClicks.add(clickKey);

        // Sort clicks into breakdowns
        const buttonId = c.button_id || 'unknown';
        const buttonLabel = c.button_label || 'Unknown';
        const ip = session.ipAddress || 'unknown';

        if (buttonId.startsWith('related-search-')) {
          const term = buttonLabel;
          const entry = session.rsBreakdownMap.get(term) || { term, clicks: 0, ips: new Set(), visitNowClicks: 0, visitNowIps: new Set() };
          entry.clicks++;
          entry.ips.add(ip);
          session.rsBreakdownMap.set(term, entry);
        } else if (buttonId.startsWith('visit-now-')) {
          const term = buttonLabel; // Assumes label matches the related search term
          const entry = session.rsBreakdownMap.get(term) || { term, clicks: 0, ips: new Set(), visitNowClicks: 0, visitNowIps: new Set() };
          entry.visitNowClicks++;
          entry.visitNowIps.add(ip);
          session.rsBreakdownMap.set(term, entry);
        } else if (buttonId.startsWith('blog-card-')) {
          const title = buttonLabel;
          const entry = session.blogBreakdownMap.get(title) || { title, clicks: 0, ips: new Set() };
          entry.clicks++;
          entry.ips.add(ip);
          session.blogBreakdownMap.set(title, entry);
        } else {
          // Add to other button interactions
          const key = buttonLabel || buttonId;
          const entry = session.buttonInteractionsMap.get(key) || { button: key, total: 0, uniqueSet: new Set() };
          entry.total++;
          entry.uniqueSet.add(ip);
          session.buttonInteractionsMap.set(key, entry);
        }
      }
    });

    // Convert maps to final arrays for the session object
    const sessions = Array.from(sessionMap.values()).map((s: any) => ({
      sessionId: s.sessionId,
      siteName: 'TopicMingle',
      siteIcon: Palette,
      siteColor: 'from-cyan-500 to-cyan-600',
      device: s.device,
      ipAddress: s.ipAddress,
      country: s.country,
      timeSpent: s.timeSpent,
      timestamp: s.timestamp,
      pageViews: s.pageViews,
      uniquePages: s.uniquePagesSet.size,
      totalClicks: s.totalClicks,
      uniqueClicks: s.uniqueClicksSet.size,
      searchResults: Array.from(s.rsBreakdownMap.values()).map((r: any) => ({
        term: r.term,
        views: 0,
        totalClicks: r.clicks,
        uniqueClicks: r.ips.size,
        visitNowClicks: r.visitNowClicks,
        visitNowUnique: r.visitNowIps.size,
      })),
      blogClicks: Array.from(s.blogBreakdownMap.values()).map((b: any) => ({
        title: b.title,
        totalClicks: b.clicks,
        uniqueClicks: b.ips.size,
      })),
      buttonInteractions: Array.from(s.buttonInteractionsMap.values()).map((bi: any) => ({
        button: bi.button,
        total: bi.total,
        unique: bi.uniqueSet.size,
      })),
    })) as SessionDetail[];

    const stats = {
      sessions: sessionMap.size,
      pageViews: sessions.reduce((sum: number, s: any) => sum + s.pageViews, 0),
      uniquePages: globalUniquePages.size,
      totalClicks: sessions.reduce((sum: number, s: any) => sum + s.totalClicks, 0),
      uniqueClicks: globalUniqueClicks.size,
    };

    return { stats, sessions };
  };

  const formatTimeSpent = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  const filteredStats = selectedSite === 'all'
    ? siteStats
    : siteStats.filter(stat => {
        const site = sites.find(s => s.name === stat.siteName);
        return site && site.id === selectedSite;
      });

  const filteredSessions = selectedSite === 'all'
    ? sessions
    : sessions.filter(s => {
        const site = sites.find(site => site.name === s.siteName);
        return site && site.id === selectedSite;
      });

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Controls */}
      {!hideControls && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Multi-Site Analytics Hub</h2>
          <div className="flex gap-3">
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[200px] bg-background border-border">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchAnalytics} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {hideControls && (
        <div className="flex justify-end">
          <Button onClick={fetchAnalytics} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredStats.map((stat, idx) => {
          const SiteIcon = stat.icon;
          return (
            <Card key={idx} className="overflow-hidden border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <SiteIcon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">{stat.siteName}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions</p>
                    <p className="text-2xl font-bold text-foreground">{stat.sessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold text-foreground">{stat.pageViews}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Pages</p>
                    <p className="text-2xl font-bold text-foreground">{stat.uniquePages}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Clicks</p>
                    <p className="text-2xl font-bold text-foreground">{stat.totalClicks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session Details */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground mb-4">Session Details</h3>
        {filteredSessions.map((session, sessionIdx) => {
          const SiteIcon = session.siteIcon;
          const isExpanded = expandedSessions.has(session.sessionId);
          const uniqueKey = `${session.siteName}-${session.sessionId}-${sessionIdx}`;
          
          return (
            <Collapsible key={uniqueKey} open={isExpanded} onOpenChange={() => toggleSession(session.sessionId)}>
              <Card className={`overflow-hidden border-border bg-gradient-to-br ${session.siteColor} text-white`}>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Left: Site Icon & Info */}
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                          <SiteIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{session.siteName}</p>
                          <p className="text-xs opacity-90">{session.device}</p>
                          <p className="text-xs opacity-80">{session.ipAddress} • {session.country}</p>
                        </div>
                      </div>

                      {/* Middle: Stats Columns */}
                      <div className="flex gap-8 items-center">
                        {/* Page Views */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs opacity-80 mb-1">Page Views</p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.pageViews}</p>
                              <p className="text-xs opacity-70">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.uniquePages}</p>
                              <p className="text-xs opacity-70">Unique</p>
                            </div>
                          </div>
                        </div>

                        {/* Searches */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs opacity-80 mb-1">Searches</p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.searchResults.reduce((sum, sr) => sum + sr.totalClicks, 0)}</p>
                              <p className="text-xs opacity-70">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.searchResults.reduce((sum, sr) => sum + sr.uniqueClicks, 0)}</p>
                              <p className="text-xs opacity-70">Unique</p>
                            </div>
                          </div>
                        </div>

                        {/* Interactions */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs opacity-80 mb-1">Interactions</p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.totalClicks}</p>
                              <p className="text-xs opacity-70">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold">{session.uniqueClicks}</p>
                              <p className="text-xs opacity-70">Unique</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Expand Icon */}
                      <div className="ml-4">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="bg-white/10 backdrop-blur-sm border-t border-white/20 p-4 space-y-4">
                    {/* Related Search Clicks */}
                    {session.searchResults.length > 0 && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Search className="h-4 w-4" />
                          <h4 className="font-semibold text-sm">Related Search Clicks</h4>
                        </div>
                        <div className="space-y-2">
                          {session.searchResults.map((sr, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-2">
                              <span className="font-medium flex-1">{sr.term}</span>
                              <div className="flex gap-6 text-xs">
                                <span>Total: <strong>{sr.totalClicks}</strong></span>
                                <span>Unique: <strong>{sr.uniqueClicks}</strong></span>
                                {sr.visitNowClicks > 0 && (
                                  <span className="text-green-300">Visit Now: <strong>{sr.visitNowClicks}</strong></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blog Clicks */}
                    {session.blogClicks.length > 0 && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4" />
                          <h4 className="font-semibold text-sm">Blog Clicks</h4>
                        </div>
                        <div className="space-y-2">
                          {session.blogClicks.map((bc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-2">
                              <span className="font-medium flex-1">{bc.title}</span>
                              <div className="flex gap-6 text-xs">
                                <span>Total: <strong>{bc.totalClicks}</strong></span>
                                <span>Unique: <strong>{bc.uniqueClicks}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Button Interactions */}
                    {session.buttonInteractions.length > 0 && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <MousePointerClick className="h-4 w-4" />
                          <h4 className="font-semibold text-sm">Button Interactions</h4>
                        </div>
                        <div className="space-y-2">
                          {session.buttonInteractions.map((bi, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-2">
                              <span className="font-medium flex-1">{bi.button}</span>
                              <div className="flex gap-6 text-xs">
                                <span>Total: <strong>{bi.total}</strong></span>
                                <span>Unique: <strong>{bi.unique}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}