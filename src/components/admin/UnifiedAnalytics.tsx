import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { fastMoneyClient } from '@/integrations/fastmoney/client';
import { offerGrabZoneClient } from '@/integrations/offergrabzone/client';
import { mingleMoodyClient } from '@/integrations/minglemoody/client';
import { dataOrbitClient } from '@/integrations/dataorbit/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, RefreshCw, Download, ShoppingCart, Home, Palette, Search, FileText, MousePointerClick, DollarSign, Gift, MessageCircle, Globe } from 'lucide-react';
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
    { id: 'datacreditzone', name: 'DataCreditZone', icon: FileText, color: 'from-purple-500 to-purple-600' },
    { id: 'main', name: 'TopicMingle', icon: Palette, color: 'from-cyan-500 to-cyan-600' },
    { id: 'fastmoney', name: 'FastMoney', icon: DollarSign, color: 'from-yellow-500 to-yellow-600' },
    { id: 'offergrabzone', name: 'OfferGrabZone', icon: ShoppingCart, color: 'from-pink-500 to-pink-600' },
    { id: 'minglemoody', name: 'MingleMoody', icon: MessageCircle, color: 'from-cyan-400 to-cyan-600' },
    { id: 'dataorbit', name: 'DataOrbit', icon: Globe, color: 'from-indigo-500 to-indigo-600' },
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
      const [dataCreditZone, mainProj, fastMoney, offerGrabZone, mingleMoody, dataOrbit] = await Promise.all([
        fetchDataCreditZone(),
        fetchMainProject(),
        fetchFastMoney(),
        fetchOfferGrabZone(),
        fetchMingleMoody(),
        fetchDataOrbit(),
      ]);

      const allStats: SiteStats[] = [
        { siteName: 'DataCreditZone', icon: FileText, color: 'from-purple-500 to-purple-600', ...dataCreditZone.stats },
        { siteName: 'TopicMingle', icon: Palette, color: 'from-cyan-500 to-cyan-600', ...mainProj.stats },
        { siteName: 'FastMoney', icon: DollarSign, color: 'from-yellow-500 to-yellow-600', ...fastMoney.stats },
        { siteName: 'OfferGrabZone', icon: Gift, color: 'from-pink-500 to-pink-600', ...offerGrabZone.stats },
        { siteName: 'MingleMoody', icon: MessageCircle, color: 'from-cyan-400 to-cyan-600', ...mingleMoody.stats },
        { siteName: 'DataOrbit', icon: Globe, color: 'from-indigo-500 to-indigo-600', ...dataOrbit.stats },
      ];

      setSiteStats(allStats);

      const allSessions = [
        ...dataCreditZone.sessions,
        ...mainProj.sessions,
        ...fastMoney.sessions,
        ...offerGrabZone.sessions,
        ...mingleMoody.sessions,
        ...dataOrbit.sessions,
      ];

      // Sort by timestamp (latest first)
      setSessions(allSessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch & process DataCreditZone analytics
   * Note: DataCreditZone doesn't have sessions/link_tracking tables, use email_submissions instead
   */
  const fetchDataCreditZone = async () => {
    // Fetch available data from DataCreditZone
    const [emailsRes, blogsRes, searchesRes, webResultsRes, relSearchesDataRes, webResultsDataRes] = await Promise.all([
      tejaStarinClient.from('email_submissions').select('*'),
      tejaStarinClient.from('blogs').select('id', { count: 'exact', head: true }),
      tejaStarinClient.from('related_searches').select('id', { count: 'exact', head: true }),
      tejaStarinClient.from('web_results').select('id', { count: 'exact', head: true }),
      tejaStarinClient.from('related_searches').select('*'),
      tejaStarinClient.from('web_results').select('*'),
    ]);

    const emails = emailsRes.data || [];
    const relatedSearches = relSearchesDataRes.data || [];
    const webResults = webResultsDataRes.data || [];
    const totalRelatedSearches = searchesRes.count || 0;
    const webResultsCount = webResultsRes.count || 0;
    
    // Create session-like entries from email submissions with related searches
    const sessions: SessionDetail[] = emails.map((email: any, index: number) => {
      // Get related searches for this session
      const sessionSearches = relatedSearches.filter((rs: any) => 
        rs.source === email.source || rs.page_key === email.page_key
      );
      
      // Get web results for this session
      const sessionWebResults = webResults.filter((wr: any) => 
        wr.source === email.source || wr.page_key === email.page_key
      );
      
      // If no direct matches, distribute evenly
      const searchesToUse = sessionSearches.length > 0 
        ? sessionSearches 
        : relatedSearches.slice(0, Math.ceil(totalRelatedSearches / Math.max(emails.length, 1)));
      
      const webResultsToUse = sessionWebResults.length > 0
        ? sessionWebResults
        : webResults.slice(0, Math.ceil(webResultsCount / Math.max(emails.length, 1)));
      
      const searchCount = searchesToUse.length;
      const resultCount = webResultsToUse.length;
      
      return {
        sessionId: email.id || email.email,
        siteName: 'DataCreditZone',
        siteIcon: FileText,
        siteColor: 'from-purple-500 to-purple-600',
        device: 'Desktop',
        ipAddress: email.ip_address || 'N/A',
        country: email.country || 'Unknown',
        timeSpent: '0s',
        timestamp: email.submitted_at || email.created_at || new Date().toISOString(),
        pageViews: 1,
        uniquePages: 1,
        totalClicks: searchCount + resultCount,
        uniqueClicks: searchCount + resultCount,
        searchResults: searchesToUse.map((rs: any) => ({
          term: rs.search_text || rs.title || 'Unknown',
          views: 1,
          totalClicks: 1,
          uniqueClicks: 1,
          visitNowClicks: 0,
          visitNowUnique: 0,
        })),
        blogClicks: webResultsToUse.map((wr: any) => ({
          title: wr.title || wr.target_url || 'Unknown Result',
          totalClicks: 1,
          uniqueClicks: 1,
        })),
        buttonInteractions: [],
      };
    });

    const stats = {
      sessions: emails.length,
      pageViews: blogsRes.count || 0,
      uniquePages: totalRelatedSearches,
      totalClicks: webResultsCount,
      uniqueClicks: emails.length,
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
      .order('last_active', { ascending: false });

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
        device: s.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.last_active || s.created_at || new Date().toISOString(),
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

  /**
   * Fetch & process FastMoney data from link_tracking/sessions/web_results/related_searches tables
   */
  const fetchFastMoney = async () => {
    const { data: sessionsData } = await fastMoneyClient
      .from('sessions')
      .select('*')
      .order('last_activity', { ascending: false });

    const { data: clicks } = await fastMoneyClient
      .from('link_tracking')
      .select('*');

    const { data: webResults } = await fastMoneyClient
      .from('web_results')
      .select('id, title');

    const { data: relatedSearches } = await fastMoneyClient
      .from('related_searches')
      .select('id, title');

    const webResultsMap = new Map((webResults || []).map((w: any) => [w.id, w.title]));
    const searchesMap = new Map((relatedSearches || []).map((s: any) => [s.id, s.title]));

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (sessionsData || []).forEach((s: any) => {
      sessionMap.set(s.session_id, {
        sessionId: s.session_id,
        siteName: 'FastMoney',
        siteIcon: DollarSign,
        siteColor: 'from-yellow-500 to-yellow-600',
        device: s.device_type || 'Unknown',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.started_at || new Date().toISOString(),
        pageViews: 1,
        uniquePagesSet: new Set<string>(),
        totalClicks: 0,
        uniqueClicksSet: new Set<string>(),
        searchResults: [] as Array<any>,
        blogClicks: [] as Array<any>,
        buttonInteractions: [] as Array<any>,
        webResultClicksMap: new Map<string, any>(),
        searchClicksMap: new Map<string, any>(),
      });
    });

    (clicks || []).forEach((c: any) => {
      const session = sessionMap.get(c.session_id);
      if (session) {
        session.totalClicks++;
        const clickKey = c.web_result_id || c.related_search_id || `click-${c.id}`;
        session.uniqueClicksSet.add(clickKey);
        globalUniqueClicks.add(clickKey);

        if (c.web_result_id) {
          const title = webResultsMap.get(c.web_result_id) || 'Unknown Result';
          const entry = session.webResultClicksMap.get(c.web_result_id) || { title, total: 0, uniqueIps: new Set() };
          entry.total++;
          if (c.ip_address) entry.uniqueIps.add(c.ip_address);
          session.webResultClicksMap.set(c.web_result_id, entry);
        }

        if (c.related_search_id) {
          const title = searchesMap.get(c.related_search_id) || 'Unknown Search';
          const entry = session.searchClicksMap.get(c.related_search_id) || { title, total: 0, uniqueIps: new Set() };
          entry.total++;
          if (c.ip_address) entry.uniqueIps.add(c.ip_address);
          session.searchClicksMap.set(c.related_search_id, entry);
        }
      }
    });

    const sessions: SessionDetail[] = [];
    sessionMap.forEach((session) => {
      const searchResults = Array.from(session.searchClicksMap.values()).map((e: any) => ({
        term: e.title,
        views: 0,
        totalClicks: e.total,
        uniqueClicks: e.uniqueIps.size,
        visitNowClicks: 0,
        visitNowUnique: 0,
      }));

      const blogClicks = Array.from(session.webResultClicksMap.values()).map((e: any) => ({
        title: e.title,
        totalClicks: e.total,
        uniqueClicks: e.uniqueIps.size,
      }));

      sessions.push({
        sessionId: session.sessionId,
        siteName: session.siteName,
        siteIcon: session.siteIcon,
        siteColor: session.siteColor,
        device: session.device,
        ipAddress: session.ipAddress,
        country: session.country,
        timeSpent: session.timeSpent,
        timestamp: session.timestamp,
        pageViews: session.pageViews,
        uniquePages: session.uniquePagesSet.size,
        totalClicks: session.totalClicks,
        uniqueClicks: session.uniqueClicksSet.size,
        searchResults,
        blogClicks,
        buttonInteractions: [],
      });
    });

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
   * Fetch & process OfferGrabZone data
   */
  const fetchOfferGrabZone = async () => {
    // OfferGrabZone uses different column names
    const { data: sessionsData } = await offerGrabZoneClient
      .from('sessions')
      .select('*')
      .order('last_active', { ascending: false });

    const { data: clicks } = await offerGrabZoneClient
      .from('clicks')
      .select('*');

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (sessionsData || []).forEach((s: any) => {
      sessionMap.set(s.session_id, {
        sessionId: s.session_id,
        siteName: 'OfferGrabZone',
        siteIcon: Gift,
        siteColor: 'from-pink-500 to-pink-600',
        device: s.device === 'mobile' ? 'Mobile' : 'Desktop',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.last_active || s.first_seen || new Date().toISOString(),
        pageViews: s.page_views || 1,
        uniquePagesSet: new Set<string>(),
        totalClicks: 0,
        uniqueClicksSet: new Set<string>(),
        searchResults: [] as Array<any>,
        blogClicks: [] as Array<any>,
        buttonInteractions: [] as Array<any>,
      });
      globalUniquePages.add(s.session_id);
    });

    (clicks || []).forEach((c: any) => {
      const session = sessionMap.get(c.session_id);
      if (session) {
        session.totalClicks++;
        const clickKey = c.id || `click-${c.item_id}`;
        session.uniqueClicksSet.add(clickKey);
        globalUniqueClicks.add(clickKey);
      }
    });

    const sessions: SessionDetail[] = [];
    sessionMap.forEach((session) => {
      sessions.push({
        sessionId: session.sessionId,
        siteName: session.siteName,
        siteIcon: session.siteIcon,
        siteColor: session.siteColor,
        device: session.device,
        ipAddress: session.ipAddress,
        country: session.country,
        timeSpent: session.timeSpent,
        timestamp: session.timestamp,
        pageViews: session.pageViews,
        uniquePages: session.uniquePagesSet.size,
        totalClicks: session.totalClicks,
        uniqueClicks: session.uniqueClicksSet.size,
        searchResults: session.searchResults,
        blogClicks: session.blogClicks,
        buttonInteractions: [],
      });
    });

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
   * Fetch & process MingleMoody data
   */
  const fetchMingleMoody = async () => {
    const { data: sessionsData } = await mingleMoodyClient
      .from('sessions')
      .select('*')
      .order('last_activity', { ascending: false });

    const { data: clicks } = await mingleMoodyClient
      .from('click_tracking')
      .select('*');

    const { data: relatedSearches } = await mingleMoodyClient
      .from('related_searches')
      .select('id, search_text, title');

    const { data: webResults } = await mingleMoodyClient
      .from('web_results')
      .select('id, title');

    const webResultsMap = new Map((webResults || []).map((w: any) => [w.id, w.title]));
    const searchesMap = new Map((relatedSearches || []).map((s: any) => [s.id, s.search_text || s.title]));

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (sessionsData || []).forEach((s: any) => {
      sessionMap.set(s.session_id, {
        sessionId: s.session_id,
        siteName: 'MingleMoody',
        siteIcon: MessageCircle,
        siteColor: 'from-cyan-400 to-cyan-600',
        device: s.device_type || 'Desktop',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.last_activity || s.created_at || new Date().toISOString(),
        pageViews: 1,
        uniquePagesSet: new Set<string>(),
        totalClicks: 0,
        uniqueClicksSet: new Set<string>(),
        searchResults: [] as Array<any>,
        blogClicks: [] as Array<any>,
        buttonInteractions: [] as Array<any>,
        webResultClicksMap: new Map<string, any>(),
        searchClicksMap: new Map<string, any>(),
      });
      globalUniquePages.add(s.session_id);
    });

    (clicks || []).forEach((c: any) => {
      const session = sessionMap.get(c.session_id);
      if (session) {
        session.totalClicks++;
        const clickKey = c.link_id || c.related_search_id || `click-${c.id}`;
        session.uniqueClicksSet.add(clickKey);
        globalUniqueClicks.add(clickKey);

        if (c.link_id) {
          const title = webResultsMap.get(c.link_id) || 'Unknown Result';
          const entry = session.webResultClicksMap.get(c.link_id) || { title, total: 0, uniqueIps: new Set() };
          entry.total++;
          if (c.ip_address) entry.uniqueIps.add(c.ip_address);
          session.webResultClicksMap.set(c.link_id, entry);
        }

        if (c.related_search_id) {
          const title = searchesMap.get(c.related_search_id) || 'Unknown Search';
          const entry = session.searchClicksMap.get(c.related_search_id) || { title, total: 0, uniqueIps: new Set() };
          entry.total++;
          if (c.ip_address) entry.uniqueIps.add(c.ip_address);
          session.searchClicksMap.set(c.related_search_id, entry);
        }
      }
    });

    const sessions: SessionDetail[] = [];
    sessionMap.forEach((session) => {
      const searchResults = Array.from(session.searchClicksMap.values()).map((e: any) => ({
        term: e.title,
        views: 0,
        totalClicks: e.total,
        uniqueClicks: e.uniqueIps.size,
        visitNowClicks: 0,
        visitNowUnique: 0,
      }));

      const blogClicks = Array.from(session.webResultClicksMap.values()).map((e: any) => ({
        title: e.title,
        totalClicks: e.total,
        uniqueClicks: e.uniqueIps.size,
      }));

      sessions.push({
        sessionId: session.sessionId,
        siteName: session.siteName,
        siteIcon: session.siteIcon,
        siteColor: session.siteColor,
        device: session.device,
        ipAddress: session.ipAddress,
        country: session.country,
        timeSpent: session.timeSpent,
        timestamp: session.timestamp,
        pageViews: session.pageViews,
        uniquePages: session.uniquePagesSet.size,
        totalClicks: session.totalClicks,
        uniqueClicks: session.uniqueClicksSet.size,
        searchResults,
        blogClicks,
        buttonInteractions: [],
      });
    });

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
   * Fetch & process DataOrbit data from tracking_sessions/tracking_events tables
   */
  const fetchDataOrbit = async () => {
    const { data: sessionsData } = await dataOrbitClient
      .from('tracking_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: eventsData } = await dataOrbitClient
      .from('tracking_events')
      .select('*, blogs(title), related_searches(title), web_results(title)');

    const sessionMap = new Map<string, any>();
    const globalUniquePages = new Set<string>();
    const globalUniqueClicks = new Set<string>();

    (sessionsData || []).forEach((s: any) => {
      sessionMap.set(s.session_id, {
        sessionId: s.session_id,
        siteName: 'DataOrbit',
        siteIcon: Globe,
        siteColor: 'from-indigo-500 to-indigo-600',
        device: s.device || 'Desktop',
        ipAddress: s.ip_address || 'N/A',
        country: s.country || 'Unknown',
        timeSpent: '0s',
        timestamp: s.created_at || new Date().toISOString(),
        pageViews: 0,
        uniquePagesSet: new Set<string>(),
        totalClicks: 0,
        uniqueClicksSet: new Set<string>(),
        searchResults: [] as Array<any>,
        blogClicks: [] as Array<any>,
        buttonInteractions: [] as Array<any>,
        rsBreakdownMap: new Map<string, any>(),
        blogBreakdownMap: new Map<string, any>(),
      });
    });

    (eventsData || []).forEach((e: any) => {
      const session = sessionMap.get(e.session_id);
      if (!session) return;

      if (e.event_type === 'page_view') {
        session.pageViews++;
        const pageKey = e.page_url || `pv-${e.id}`;
        session.uniquePagesSet.add(pageKey);
        globalUniquePages.add(pageKey);
      } else {
        session.totalClicks++;
        const clickKey = e.id;
        session.uniqueClicksSet.add(clickKey);
        globalUniqueClicks.add(clickKey);

        if (e.event_type === 'related_search_click' && e.related_searches?.title) {
          const term = e.related_searches.title;
          const entry = session.rsBreakdownMap.get(term) || { term, clicks: 0, ips: new Set(), visitNowClicks: 0, visitNowIps: new Set() };
          entry.clicks++;
          if (e.ip_address) entry.ips.add(e.ip_address);
          session.rsBreakdownMap.set(term, entry);
        }

        if (e.event_type === 'visit_now_click' && e.related_searches?.title) {
          const term = e.related_searches.title;
          const entry = session.rsBreakdownMap.get(term) || { term, clicks: 0, ips: new Set(), visitNowClicks: 0, visitNowIps: new Set() };
          entry.visitNowClicks++;
          if (e.ip_address) entry.visitNowIps.add(e.ip_address);
          session.rsBreakdownMap.set(term, entry);
        }

        if (e.event_type === 'blog_click' && e.blogs?.title) {
          const title = e.blogs.title;
          const entry = session.blogBreakdownMap.get(title) || { title, clicks: 0, ips: new Set() };
          entry.clicks++;
          if (e.ip_address) entry.ips.add(e.ip_address);
          session.blogBreakdownMap.set(title, entry);
        }

        if (e.event_type === 'web_result_click' && e.web_results?.title) {
          const title = e.web_results.title;
          const entry = session.blogBreakdownMap.get(title) || { title, clicks: 0, ips: new Set() };
          entry.clicks++;
          if (e.ip_address) entry.ips.add(e.ip_address);
          session.blogBreakdownMap.set(title, entry);
        }
      }
    });

    const sessions: SessionDetail[] = [];
    sessionMap.forEach((session) => {
      const searchResults = Array.from(session.rsBreakdownMap.values()).map((r: any) => ({
        term: r.term,
        views: 0,
        totalClicks: r.clicks,
        uniqueClicks: r.ips.size,
        visitNowClicks: r.visitNowClicks,
        visitNowUnique: r.visitNowIps.size,
      }));

      const blogClicks = Array.from(session.blogBreakdownMap.values()).map((b: any) => ({
        title: b.title,
        totalClicks: b.clicks,
        uniqueClicks: b.ips.size,
      }));

      sessions.push({
        sessionId: session.sessionId,
        siteName: session.siteName,
        siteIcon: session.siteIcon,
        siteColor: session.siteColor,
        device: session.device,
        ipAddress: session.ipAddress,
        country: session.country,
        timeSpent: session.timeSpent,
        timestamp: session.timestamp,
        pageViews: session.pageViews,
        uniquePages: session.uniquePagesSet.size,
        totalClicks: session.totalClicks,
        uniqueClicks: session.uniqueClicksSet.size,
        searchResults,
        blogClicks,
        buttonInteractions: [],
      });
    });

    const stats = {
      sessions: sessionMap.size,
      pageViews: sessions.reduce((sum, s) => sum + s.pageViews, 0),
      uniquePages: globalUniquePages.size,
      totalClicks: sessions.reduce((sum, s) => sum + s.totalClicks, 0),
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

  const toggleSession = (uniqueKey: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueKey)) {
        newSet.delete(uniqueKey);
      } else {
        newSet.add(uniqueKey);
      }
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
          const uniqueKey = `${session.siteName}-${session.sessionId}-${sessionIdx}`;
          const isExpanded = expandedSessions.has(uniqueKey);
          
          return (
            <Collapsible key={uniqueKey} open={isExpanded} onOpenChange={() => toggleSession(uniqueKey)}>
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
                          <p className="text-xs opacity-80 flex items-center gap-1">
                            {session.ipAddress} • 
                            {session.country !== 'Unknown' && session.country !== 'WW' && session.country.length === 2 && (
                              <img 
                                src={`https://flagcdn.com/16x12/${session.country.toLowerCase()}.png`}
                                alt={session.country}
                                className="w-4 h-3 inline-block mx-0.5"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            {session.country}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString()}
                          </p>
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