import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Search, FileText, MousePointerClick, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ClickBreakdown {
  relatedSearches: { text: string; buttonId: string; count: number }[];
  blogClicks: { title: string; buttonId: string; count: number }[];
  otherClicks: { label: string; buttonId: string; count: number }[];
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
  relatedSearches: number;
  blogClicks: number;
  clickBreakdown: ClickBreakdown;
}

export function TopicMingleAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*');

      const { data: clicks } = await supabase
        .from('clicks')
        .select('*');

      const { data: blogsData } = await supabase
        .from('blogs')
        .select('id, title');

      // Process sessions
      const sessionMap = new Map<string, SessionData>();

      (sessionData || []).forEach((session: any) => {
        sessionMap.set(session.session_id, {
          sessionId: session.session_id,
          ipAddress: session.ip_address || 'N/A',
          country: session.country || 'Unknown',
          source: session.source || 'direct',
          device: session.user_agent?.includes('Mobile') ? 'mobile' : 'desktop',
          pageViews: 0,
          totalClicks: 0,
          uniqueClicks: 0,
          relatedSearches: 0,
          blogClicks: 0,
          clickBreakdown: {
            relatedSearches: [],
            blogClicks: [],
            otherClicks: [],
          },
        });
      });

      // Count page views
      (pageViews || []).forEach((view: any) => {
        const session = sessionMap.get(view.session_id);
        if (session) {
          session.pageViews++;
        }
      });

      // Process clicks and build breakdown
      (clicks || []).forEach((click: any) => {
        const session = sessionMap.get(click.session_id);
        if (session) {
          session.totalClicks++;
          const buttonId = click.button_id || '';
          const buttonLabel = click.button_label || 'Unknown';
          
          // Track blog clicks - check for blog-card- prefix or blog in button_id
          if (buttonId.startsWith('blog-card-') || buttonId.includes('blog')) {
            session.blogClicks++;
            const blogTitle = buttonLabel || 'Unknown Blog';
            
            const existingBlog = session.clickBreakdown.blogClicks.find(b => b.buttonId === buttonId);
            if (existingBlog) {
              existingBlog.count++;
            } else {
              session.clickBreakdown.blogClicks.push({ title: blogTitle, buttonId, count: 1 });
            }
          }
          // Track related search clicks - check for related-search- prefix
          else if (buttonId.startsWith('related-search-') || buttonId.includes('search')) {
            session.relatedSearches++;
            const searchText = buttonLabel || buttonId.replace('related-search-', '') || 'Unknown Search';
            
            const existingSearch = session.clickBreakdown.relatedSearches.find(s => s.buttonId === buttonId);
            if (existingSearch) {
              existingSearch.count++;
            } else {
              session.clickBreakdown.relatedSearches.push({ text: searchText, buttonId, count: 1 });
            }
          }
          // Track other clicks
          else {
            const existingOther = session.clickBreakdown.otherClicks.find(o => o.buttonId === buttonId);
            if (existingOther) {
              existingOther.count++;
            } else {
              session.clickBreakdown.otherClicks.push({ label: buttonLabel, buttonId, count: 1 });
            }
          }
        }
      });

      // Calculate unique clicks (unique button_ids per session)
      const sessionClicks = new Map<string, Set<string>>();
      (clicks || []).forEach((click: any) => {
        if (!sessionClicks.has(click.session_id)) {
          sessionClicks.set(click.session_id, new Set());
        }
        sessionClicks.get(click.session_id)!.add(click.button_id);
      });
      
      sessionClicks.forEach((buttonIds, sessionId) => {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.uniqueClicks = buttonIds.size;
        }
      });

      // Sort sessions by those with clicks first, then by recent
      const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => {
        // First sort by total clicks (descending)
        if (b.totalClicks !== a.totalClicks) {
          return b.totalClicks - a.totalClicks;
        }
        return 0;
      });

      setSessions(sortedSessions);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Session Analytics</CardTitle>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No session data available
            </div>
          ) : (
            sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.sessionId);
              const hasClicks = session.totalClicks > 0;
              
              return (
                <Collapsible 
                  key={session.sessionId} 
                  open={isExpanded} 
                  onOpenChange={() => toggleSession(session.sessionId)}
                >
                  <Card className={`overflow-hidden border ${hasClicks ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                    <CollapsibleTrigger className="w-full text-left">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          {/* Session Info */}
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {session.sessionId.slice(0, 12)}...
                              </p>
                              <p className="text-sm font-medium">{session.ipAddress}</p>
                              <p className="text-xs text-muted-foreground">
                                {session.country} • {session.source} • {session.device}
                              </p>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Page Views</p>
                              <p className="text-lg font-bold">{session.pageViews}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Clicks</p>
                              <p className="text-lg font-bold">{session.totalClicks} / {session.uniqueClicks}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Related Searches</p>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                {session.relatedSearches}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Blog Clicks</p>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                {session.blogClicks}
                              </Badge>
                            </div>
                          </div>

                          {/* Expand Icon */}
                          <div className="ml-4">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4 space-y-4">
                        {/* Related Search Clicks Breakdown */}
                        {session.clickBreakdown.relatedSearches.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Search className="h-4 w-4 text-blue-600" />
                              <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                                Related Search Clicks ({session.relatedSearches})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {session.clickBreakdown.relatedSearches.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-background rounded px-3 py-2 border">
                                  <div>
                                    <span className="font-medium">{item.text}</span>
                                    <p className="text-xs text-muted-foreground">{item.buttonId}</p>
                                  </div>
                                  <Badge variant="default">{item.count} clicks</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Blog Clicks Breakdown */}
                        {session.clickBreakdown.blogClicks.length > 0 && (
                          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-4 w-4 text-orange-600" />
                              <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">
                                Blog Clicks ({session.blogClicks})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {session.clickBreakdown.blogClicks.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-background rounded px-3 py-2 border">
                                  <div>
                                    <span className="font-medium">{item.title}</span>
                                    <p className="text-xs text-muted-foreground">{item.buttonId}</p>
                                  </div>
                                  <Badge variant="default">{item.count} clicks</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Clicks Breakdown */}
                        {session.clickBreakdown.otherClicks.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-950/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <MousePointerClick className="h-4 w-4 text-gray-600" />
                              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                Other Clicks ({session.clickBreakdown.otherClicks.reduce((sum, c) => sum + c.count, 0)})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {session.clickBreakdown.otherClicks.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-background rounded px-3 py-2 border">
                                  <div>
                                    <span className="font-medium">{item.label}</span>
                                    <p className="text-xs text-muted-foreground">{item.buttonId}</p>
                                  </div>
                                  <Badge variant="secondary">{item.count} clicks</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No clicks message */}
                        {session.totalClicks === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No click data for this session
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
