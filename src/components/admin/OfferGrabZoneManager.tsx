import { useEffect, useState } from "react";
import { offerGrabZoneClient } from "@/integrations/offergrabzone/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Save, Eye, MousePointer, Users, Globe, Search, Link } from "lucide-react";

// Types based on the schema
interface LandingContent {
  id: string;
  site_name: string;
  headline: string;
  description: string;
}

interface RelatedSearch {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
  is_active: boolean;
}

interface WebResult {
  id: string;
  name: string;
  title: string;
  description: string | null;
  link: string;
  logo_url: string | null;
  wr_page: number;
  is_sponsored: boolean;
  serial_number: number;
  allowed_countries: string[];
  fallback_link: string | null;
  is_active: boolean;
}

interface Prelanding {
  id: string;
  web_result_id: string | null;
  logo_url: string | null;
  main_image_url: string | null;
  headline: string;
  description: string | null;
  email_placeholder: string;
  cta_button_text: string;
  background_color: string;
  background_image_url: string | null;
  is_active: boolean;
}

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

interface Stats {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  relatedSearchClicks: number;
  webResultClicks: number;
}

const OfferGrabZoneManager = () => {
  const [activeTab, setActiveTab] = useState("landing");
  
  // Landing Content
  const [landingContent, setLandingContent] = useState<LandingContent | null>(null);
  
  // Related Searches
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [newSearch, setNewSearch] = useState({ title: '', serial_number: 1, target_wr: 1 });
  
  // Web Results
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedWrPage, setSelectedWrPage] = useState<number>(0);
  
  // Prelandings
  const [prelandings, setPrelandings] = useState<Prelanding[]>([]);
  const [editingPrelanding, setEditingPrelanding] = useState<Prelanding | null>(null);
  const [prelandingDialogOpen, setPrelandingDialogOpen] = useState(false);
  
  // Analytics
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    totalPageViews: 0,
    totalClicks: 0,
    relatedSearchClicks: 0,
    webResultClicks: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchLandingContent(),
      fetchSearches(),
      fetchWebResults(),
      fetchPrelandings(),
      fetchAnalytics()
    ]);
    setLoading(false);
  };

  const fetchLandingContent = async () => {
    const { data } = await offerGrabZoneClient.from('landing_content').select('*').limit(1).maybeSingle();
    if (data) setLandingContent(data);
  };

  const fetchSearches = async () => {
    const { data } = await offerGrabZoneClient.from('related_searches').select('*').order('serial_number');
    if (data) setSearches(data);
  };

  const fetchWebResults = async () => {
    const { data } = await offerGrabZoneClient.from('web_results').select('*').order('wr_page').order('serial_number');
    if (data) setWebResults(data);
  };

  const fetchPrelandings = async () => {
    const { data } = await offerGrabZoneClient.from('prelandings').select('*').order('created_at', { ascending: false });
    if (data) setPrelandings(data);
  };

  const fetchAnalytics = async () => {
    const [sessionsRes, clicksRes] = await Promise.all([
      offerGrabZoneClient.from('sessions').select('*').order('last_active', { ascending: false }),
      offerGrabZoneClient.from('clicks').select('*').order('clicked_at', { ascending: false })
    ]);
    
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (clicksRes.data) setClicks(clicksRes.data);
    
    // Calculate stats
    const totalPageViews = sessionsRes.data?.reduce((sum, s) => sum + s.page_views, 0) || 0;
    const relatedSearchClicks = clicksRes.data?.filter(c => c.click_type === 'related_search').length || 0;
    const webResultClicks = clicksRes.data?.filter(c => c.click_type === 'web_result').length || 0;
    
    setStats({
      totalSessions: sessionsRes.data?.length || 0,
      totalPageViews,
      totalClicks: clicksRes.data?.length || 0,
      relatedSearchClicks,
      webResultClicks
    });
  };

  // Landing Content handlers
  const saveLandingContent = async () => {
    if (!landingContent) return;
    
    const { error } = await offerGrabZoneClient
      .from('landing_content')
      .update({
        site_name: landingContent.site_name,
        headline: landingContent.headline,
        description: landingContent.description
      })
      .eq('id', landingContent.id);
    
    if (error) {
      toast.error("Failed to save landing content");
    } else {
      toast.success("Landing content saved!");
    }
  };

  // Related Search handlers
  const handleAddSearch = async () => {
    if (!newSearch.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const { error } = await offerGrabZoneClient.from('related_searches').insert({
      title: newSearch.title,
      serial_number: newSearch.serial_number,
      target_wr: newSearch.target_wr
    });
    
    if (error) {
      toast.error("Failed to add search");
    } else {
      toast.success("Search added!");
      setNewSearch({ title: '', serial_number: searches.length + 1, target_wr: 1 });
      fetchSearches();
    }
  };

  const handleUpdateSearch = async (search: RelatedSearch) => {
    const { error } = await offerGrabZoneClient
      .from('related_searches')
      .update({
        title: search.title,
        serial_number: search.serial_number,
        target_wr: search.target_wr,
        is_active: search.is_active
      })
      .eq('id', search.id);
    
    if (error) {
      toast.error("Failed to update search");
    } else {
      toast.success("Search updated!");
      setEditingSearch(null);
      fetchSearches();
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm("Delete this search?")) return;
    
    const { error } = await offerGrabZoneClient.from('related_searches').delete().eq('id', id);
    
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      fetchSearches();
    }
  };

  // Web Result handlers
  const handleSaveResult = async () => {
    if (!editingResult) return;
    
    if (!editingResult.name.trim() || !editingResult.title.trim() || !editingResult.link.trim()) {
      toast.error("Name, title and link are required");
      return;
    }
    
    if (editingResult.id) {
      const { error } = await offerGrabZoneClient
        .from('web_results')
        .update(editingResult)
        .eq('id', editingResult.id);
      
      if (error) {
        toast.error("Failed to update");
      } else {
        toast.success("Updated!");
        setResultDialogOpen(false);
        setEditingResult(null);
        fetchWebResults();
      }
    } else {
      const { id, ...insertData } = editingResult;
      const { error } = await offerGrabZoneClient.from('web_results').insert(insertData);
      
      if (error) {
        toast.error("Failed to add");
      } else {
        toast.success("Added!");
        setResultDialogOpen(false);
        setEditingResult(null);
        fetchWebResults();
      }
    }
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm("Delete this web result?")) return;
    
    const { error } = await offerGrabZoneClient.from('web_results').delete().eq('id', id);
    
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      fetchWebResults();
    }
  };

  // Prelanding handlers
  const handleSavePrelanding = async () => {
    if (!editingPrelanding) return;
    
    if (!editingPrelanding.headline.trim()) {
      toast.error("Headline is required");
      return;
    }
    
    if (editingPrelanding.id) {
      const { error } = await offerGrabZoneClient
        .from('prelandings')
        .update(editingPrelanding)
        .eq('id', editingPrelanding.id);
      
      if (error) {
        toast.error("Failed to update");
      } else {
        toast.success("Updated!");
        setPrelandingDialogOpen(false);
        setEditingPrelanding(null);
        fetchPrelandings();
      }
    } else {
      const { id, ...insertData } = editingPrelanding;
      const { error } = await offerGrabZoneClient.from('prelandings').insert(insertData);
      
      if (error) {
        toast.error("Failed to add");
      } else {
        toast.success("Added!");
        setPrelandingDialogOpen(false);
        setEditingPrelanding(null);
        fetchPrelandings();
      }
    }
  };

  const handleDeletePrelanding = async (id: string) => {
    if (!confirm("Delete this prelanding?")) return;
    
    const { error } = await offerGrabZoneClient.from('prelandings').delete().eq('id', id);
    
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      fetchPrelandings();
    }
  };

  const getWebResultName = (webResultId: string | null) => {
    if (!webResultId) return "Not linked";
    const result = webResults.find(r => r.id === webResultId);
    return result?.name || "Unknown";
  };

  const emptyResult: WebResult = {
    id: '',
    name: '',
    title: '',
    description: '',
    link: '',
    logo_url: '',
    wr_page: 1,
    is_sponsored: false,
    serial_number: 1,
    allowed_countries: ['worldwide'],
    fallback_link: '',
    is_active: true
  };

  const emptyPrelanding: Prelanding = {
    id: '',
    web_result_id: null,
    logo_url: '',
    main_image_url: '',
    headline: '',
    description: '',
    email_placeholder: 'Enter your email',
    cta_button_text: 'Get Started',
    background_color: '#1a1a2e',
    background_image_url: '',
    is_active: false
  };

  const filteredResults = selectedWrPage === 0 
    ? webResults 
    : webResults.filter(r => r.wr_page === selectedWrPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading OfferGrabZone...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-slate-800/50 p-1 h-auto flex-wrap border border-slate-700">
          <TabsTrigger 
            value="landing" 
            className="px-6 py-2.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
          >
            Landing Content
          </TabsTrigger>
          <TabsTrigger 
            value="searches" 
            className="px-6 py-2.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
          >
            Search Buttons
          </TabsTrigger>
          <TabsTrigger 
            value="webresults" 
            className="px-6 py-2.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
          >
            Web Results
          </TabsTrigger>
          <TabsTrigger 
            value="prelandings" 
            className="px-6 py-2.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
          >
            Pre-Landings
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="px-6 py-2.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Landing Content Tab */}
        <TabsContent value="landing" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Edit Landing Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {landingContent ? (
                <>
                  <div>
                    <Label className="text-slate-300">Site Name</Label>
                    <Input
                      value={landingContent.site_name}
                      onChange={(e) => setLandingContent({ ...landingContent, site_name: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Headline</Label>
                    <Input
                      value={landingContent.headline}
                      onChange={(e) => setLandingContent({ ...landingContent, headline: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={landingContent.description}
                      onChange={(e) => setLandingContent({ ...landingContent, description: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                      rows={4}
                    />
                  </div>
                  <Button onClick={saveLandingContent} className="bg-cyan-500 hover:bg-cyan-600">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <p className="text-slate-400">No landing content found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Buttons Tab */}
        <TabsContent value="searches" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Buttons
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">{searches.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new search */}
              <div className="flex gap-2 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <Input
                  placeholder="Search title..."
                  value={newSearch.title}
                  onChange={(e) => setNewSearch({ ...newSearch, title: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <Input
                  type="number"
                  placeholder="Serial #"
                  value={newSearch.serial_number}
                  onChange={(e) => setNewSearch({ ...newSearch, serial_number: parseInt(e.target.value) || 1 })}
                  className="bg-slate-800 border-slate-600 text-white w-24"
                />
                <Select
                  value={newSearch.target_wr.toString()}
                  onValueChange={(v) => setNewSearch({ ...newSearch, target_wr: parseInt(v) })}
                >
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Target WR" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>WR {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddSearch} className="bg-cyan-500 hover:bg-cyan-600">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Search list */}
              <div className="space-y-2">
                {searches.map((search) => (
                  <div key={search.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    {editingSearch?.id === search.id ? (
                      <>
                        <Input
                          value={editingSearch.title}
                          onChange={(e) => setEditingSearch({ ...editingSearch, title: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white flex-1"
                        />
                        <Input
                          type="number"
                          value={editingSearch.serial_number}
                          onChange={(e) => setEditingSearch({ ...editingSearch, serial_number: parseInt(e.target.value) || 1 })}
                          className="bg-slate-800 border-slate-600 text-white w-20"
                        />
                        <Select
                          value={editingSearch.target_wr.toString()}
                          onValueChange={(v) => setEditingSearch({ ...editingSearch, target_wr: parseInt(v) })}
                        >
                          <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(n => (
                              <SelectItem key={n} value={n.toString()}>WR {n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => handleUpdateSearch(editingSearch)} className="bg-green-500 hover:bg-green-600">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSearch(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Badge className="bg-cyan-500/20 text-cyan-400">#{search.serial_number}</Badge>
                        <span className="text-white flex-1">{search.title}</span>
                        <Badge variant="outline" className="text-slate-400 border-slate-600">
                          → WR {search.target_wr}
                        </Badge>
                        <Switch
                          checked={search.is_active}
                          onCheckedChange={(checked) => handleUpdateSearch({ ...search, is_active: checked })}
                        />
                        <Button size="sm" variant="ghost" onClick={() => setEditingSearch(search)}>
                          <Edit className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteSearch(search.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Results Tab */}
        <TabsContent value="webresults" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Link className="w-5 h-5" />
                Web Results
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">{webResults.length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Select value={selectedWrPage.toString()} onValueChange={(v) => setSelectedWrPage(parseInt(v))}>
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Filter WR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Pages</SelectItem>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>WR {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => { setEditingResult({ ...emptyResult }); setResultDialogOpen(true); }}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Result
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <Badge className="bg-purple-500/20 text-purple-400">WR {result.wr_page}</Badge>
                    <Badge className="bg-slate-600/50 text-slate-300">#{result.serial_number}</Badge>
                    {result.is_sponsored && <Badge className="bg-yellow-500/20 text-yellow-400">Sponsored</Badge>}
                    <span className="text-white flex-1 font-medium">{result.name}</span>
                    <span className="text-slate-400 text-sm truncate max-w-48">{result.title}</span>
                    {prelandings.some(p => p.web_result_id === result.id) && (
                      <Badge className="bg-green-500/20 text-green-400">Has Pre-landing</Badge>
                    )}
                    <Switch
                      checked={result.is_active}
                      onCheckedChange={async (checked) => {
                        await offerGrabZoneClient.from('web_results').update({ is_active: checked }).eq('id', result.id);
                        fetchWebResults();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => { setEditingResult(result); setResultDialogOpen(true); }}>
                      <Edit className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteResult(result.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pre-Landings Tab */}
        <TabsContent value="prelandings" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Pre-Landing Pages
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">{prelandings.length}</Badge>
              </CardTitle>
              <Button 
                onClick={() => { setEditingPrelanding({ ...emptyPrelanding }); setPrelandingDialogOpen(true); }}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Pre-Landing
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prelandings.map((prelanding) => (
                  <div key={prelanding.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <Badge className={prelanding.is_active ? "bg-green-500/20 text-green-400" : "bg-slate-600/50 text-slate-400"}>
                      {prelanding.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-white flex-1 font-medium truncate">{prelanding.headline}</span>
                    <Badge variant="outline" className="text-slate-400 border-slate-600">
                      → {getWebResultName(prelanding.web_result_id)} <span className="text-cyan-400 ml-1">(Web Result)</span>
                    </Badge>
                    <Switch
                      checked={prelanding.is_active}
                      onCheckedChange={async (checked) => {
                        await offerGrabZoneClient.from('prelandings').update({ is_active: checked }).eq('id', prelanding.id);
                        fetchPrelandings();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => { setEditingPrelanding(prelanding); setPrelandingDialogOpen(true); }}>
                      <Edit className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeletePrelanding(prelanding.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-cyan-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                    <p className="text-sm text-slate-400">Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalPageViews}</p>
                    <p className="text-sm text-slate-400">Page Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalClicks}</p>
                    <p className="text-sm text-slate-400">Total Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Search className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.relatedSearchClicks}</p>
                    <p className="text-sm text-slate-400">Search Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Link className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.webResultClicks}</p>
                    <p className="text-sm text-slate-400">Result Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions Table */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-2 text-slate-400">Session ID</th>
                      <th className="text-left p-2 text-slate-400">Country</th>
                      <th className="text-left p-2 text-slate-400">Device</th>
                      <th className="text-left p-2 text-slate-400">Source</th>
                      <th className="text-left p-2 text-slate-400">Page Views</th>
                      <th className="text-left p-2 text-slate-400">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 20).map((session) => (
                      <tr key={session.id} className="border-b border-slate-700/50">
                        <td className="p-2 text-white font-mono text-sm">{session.session_id.slice(0, 8)}...</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-slate-300 border-slate-600">
                            <Globe className="w-3 h-3 mr-1" />
                            {session.country_code}
                          </Badge>
                        </td>
                        <td className="p-2 text-slate-300">{session.device}</td>
                        <td className="p-2 text-slate-300">{session.source}</td>
                        <td className="p-2 text-cyan-400">{session.page_views}</td>
                        <td className="p-2 text-slate-400 text-sm">
                          {new Date(session.last_active).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Web Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingResult?.id ? 'Edit' : 'Add'} Web Result</DialogTitle>
          </DialogHeader>
          {editingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Name *</Label>
                  <Input
                    value={editingResult.name}
                    onChange={(e) => setEditingResult({ ...editingResult, name: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Title *</Label>
                  <Input
                    value={editingResult.title}
                    onChange={(e) => setEditingResult({ ...editingResult, title: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={editingResult.description || ''}
                  onChange={(e) => setEditingResult({ ...editingResult, description: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Link *</Label>
                  <Input
                    value={editingResult.link}
                    onChange={(e) => setEditingResult({ ...editingResult, link: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Logo URL</Label>
                  <Input
                    value={editingResult.logo_url || ''}
                    onChange={(e) => setEditingResult({ ...editingResult, logo_url: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">WR Page</Label>
                  <Select
                    value={editingResult.wr_page.toString()}
                    onValueChange={(v) => setEditingResult({ ...editingResult, wr_page: parseInt(v) })}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={n.toString()}>WR {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Serial #</Label>
                  <Input
                    type="number"
                    value={editingResult.serial_number}
                    onChange={(e) => setEditingResult({ ...editingResult, serial_number: parseInt(e.target.value) || 1 })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editingResult.is_sponsored}
                    onCheckedChange={(checked) => setEditingResult({ ...editingResult, is_sponsored: checked })}
                  />
                  <Label className="text-slate-300">Sponsored</Label>
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Fallback Link</Label>
                <Input
                  value={editingResult.fallback_link || ''}
                  onChange={(e) => setEditingResult({ ...editingResult, fallback_link: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <Button onClick={handleSaveResult} className="w-full bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                Save Web Result
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prelanding Dialog */}
      <Dialog open={prelandingDialogOpen} onOpenChange={setPrelandingDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingPrelanding?.id ? 'Edit' : 'Add'} Pre-Landing</DialogTitle>
          </DialogHeader>
          {editingPrelanding && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Web Result <span className="text-cyan-400">(Web Result)</span></Label>
                <Select
                  value={editingPrelanding.web_result_id || 'none'}
                  onValueChange={(v) => setEditingPrelanding({ ...editingPrelanding, web_result_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Select web result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {webResults.map((result) => (
                      <SelectItem key={result.id} value={result.id}>
                        {result.name} - {result.title} 
                        <span className="text-cyan-400 ml-2">(Web Result)</span>
                        {prelandings.some(p => p.web_result_id === result.id && p.id !== editingPrelanding.id) && (
                          <span className="text-green-400 ml-2">• Has Pre-landing</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Headline *</Label>
                <Input
                  value={editingPrelanding.headline}
                  onChange={(e) => setEditingPrelanding({ ...editingPrelanding, headline: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={editingPrelanding.description || ''}
                  onChange={(e) => setEditingPrelanding({ ...editingPrelanding, description: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Logo URL</Label>
                  <Input
                    value={editingPrelanding.logo_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, logo_url: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Main Image URL</Label>
                  <Input
                    value={editingPrelanding.main_image_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, main_image_url: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Email Placeholder</Label>
                  <Input
                    value={editingPrelanding.email_placeholder}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, email_placeholder: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">CTA Button Text</Label>
                  <Input
                    value={editingPrelanding.cta_button_text}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, cta_button_text: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editingPrelanding.background_color}
                      onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_color: e.target.value })}
                      className="w-12 h-10 p-1 bg-slate-900 border-slate-600"
                    />
                    <Input
                      value={editingPrelanding.background_color}
                      onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_color: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Background Image URL</Label>
                  <Input
                    value={editingPrelanding.background_image_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_image_url: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPrelanding.is_active}
                  onCheckedChange={(checked) => setEditingPrelanding({ ...editingPrelanding, is_active: checked })}
                />
                <Label className="text-slate-300">Active</Label>
              </div>
              <Button onClick={handleSavePrelanding} className="w-full bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                Save Pre-Landing
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfferGrabZoneManager;
