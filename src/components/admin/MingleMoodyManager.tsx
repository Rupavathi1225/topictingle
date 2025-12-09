import { useState, useEffect } from "react";
import { mingleMoodyClient } from "@/integrations/minglemoody/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { MingleMoodyBlogs } from "./MingleMoodyBlogs";

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string | null;
  web_result_page: number;
  position: number;
  display_order: number;
  is_active: boolean;
}

interface WebResult {
  id: string;
  web_result_page: number;
  title: string;
  description: string | null;
  logo_url: string | null;
  original_link: string;
  position: number;
  prelanding_key: string | null;
  is_sponsored: boolean;
  is_active: boolean;
}

interface LandingContent {
  id: string;
  title: string;
  description: string;
}

interface Prelanding {
  id: string;
  key: string;
  logo_url: string | null;
  main_image_url: string | null;
  headline: string;
  subtitle: string | null;
  description: string | null;
  redirect_description: string | null;
  is_active: boolean;
}

interface MingleMoodyManagerProps {
  initialTab?: string;
}

export const MingleMoodyManager = ({ initialTab = "landing" }: MingleMoodyManagerProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      const tabMap: Record<string, string> = {
        'landing': 'landing',
        'searches': 'searches',
        'webresults': 'webresults',
        'prelanding': 'prelandings',
        'blogs': 'blogs'
      };
      setActiveTab(tabMap[initialTab] || initialTab);
    }
  }, [initialTab]);

  // Landing Content
  const [landingContent, setLandingContent] = useState<LandingContent | null>(null);

  // Related Searches
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [selectedWebResults, setSelectedWebResults] = useState<Set<string>>(new Set());
  const [searchForm, setSearchForm] = useState({
    search_text: "", title: "", web_result_page: 1, position: 1, display_order: 0, is_active: true
  });

  // Bulk action handlers for Related Searches
  const toggleSearchSelection = (id: string) => {
    const newSelected = new Set(selectedSearches);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedSearches(newSelected);
  };

  const handleSelectAllSearches = () => {
    if (selectedSearches.size === filteredSearches.length) setSelectedSearches(new Set());
    else setSelectedSearches(new Set(filteredSearches.map(s => s.id)));
  };

  const handleBulkDeleteSearches = async () => {
    if (!confirm(`Delete ${selectedSearches.size} search(es)?`)) return;
    for (const id of selectedSearches) {
      await mingleMoodyClient.from('click_tracking').delete().eq('related_search_id', id);
      await mingleMoodyClient.from("related_searches").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleBulkActivateSearches = async () => {
    await mingleMoodyClient.from("related_searches").update({ is_active: true }).in("id", Array.from(selectedSearches));
    toast.success(`Activated ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleBulkDeactivateSearches = async () => {
    await mingleMoodyClient.from("related_searches").update({ is_active: false }).in("id", Array.from(selectedSearches));
    toast.success(`Deactivated ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  // Bulk action handlers for Web Results
  const toggleWebResultSelection = (id: string) => {
    const newSelected = new Set(selectedWebResults);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedWebResults(newSelected);
  };

  const handleSelectAllWebResults = () => {
    if (selectedWebResults.size === filteredWebResults.length) setSelectedWebResults(new Set());
    else setSelectedWebResults(new Set(filteredWebResults.map(w => w.id)));
  };

  const handleBulkDeleteWebResults = async () => {
    if (!confirm(`Delete ${selectedWebResults.size} web result(s)?`)) return;
    for (const id of selectedWebResults) {
      await mingleMoodyClient.from('click_tracking').delete().eq('link_id', id);
      await mingleMoodyClient.from('link_clicks').delete().eq('web_result_id', id);
    }
    await mingleMoodyClient.from("web_results").delete().in("id", Array.from(selectedWebResults));
    toast.success(`Deleted ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
    fetchAllWebResults();
  };

  const handleBulkActivateWebResults = async () => {
    await mingleMoodyClient.from("web_results").update({ is_active: true }).in("id", Array.from(selectedWebResults));
    toast.success(`Activated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  const handleBulkDeactivateWebResults = async () => {
    await mingleMoodyClient.from("web_results").update({ is_active: false }).in("id", Array.from(selectedWebResults));
    toast.success(`Deactivated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  // Web Results
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [allWebResults, setAllWebResults] = useState<WebResult[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [webResultDialog, setWebResultDialog] = useState(false);
  const [editingWebResult, setEditingWebResult] = useState<WebResult | null>(null);
  const [selectedSearchForResult, setSelectedSearchForResult] = useState<string>("");
  const [forceReplace, setForceReplace] = useState(false);
  const [webResultForm, setWebResultForm] = useState({
    title: "", description: "", logo_url: "", original_link: "",
    web_result_page: 1, position: 0, prelanding_key: "", is_active: true
  });

  // Prelandings
  const [prelandings, setPrelandings] = useState<Prelanding[]>([]);
  const [prelandingDialog, setPrelandingDialog] = useState(false);
  const [editingPrelanding, setEditingPrelanding] = useState<Prelanding | null>(null);
  const [prelandingForm, setPrelandingForm] = useState({
    key: "", logo_url: "", main_image_url: "", headline: "", subtitle: "",
    description: "", redirect_description: "You will be redirected to...", is_active: true
  });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === "webresults") fetchWebResults();
  }, [selectedPage]);

  const fetchAll = async () => {
    await Promise.all([
      fetchLandingContent(),
      fetchRelatedSearches(),
      fetchWebResults(),
      fetchAllWebResults(),
      fetchPrelandings()
    ]);
  };

  const fetchLandingContent = async () => {
    const { data } = await mingleMoodyClient.from("landing_content").select("*").limit(1).maybeSingle();
    if (data) setLandingContent(data);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await mingleMoodyClient.from("related_searches").select("*").order("display_order");
    if (error) toast.error("Failed to fetch related searches");
    else setRelatedSearches(data || []);
  };

  const fetchAllWebResults = async () => {
    const { data, error } = await mingleMoodyClient.from("web_results").select("*").order("position");
    if (error) console.error("Failed to fetch all web results:", error);
    else setAllWebResults(data || []);
  };

  const fetchWebResults = async () => {
    const { data, error } = await mingleMoodyClient
      .from("web_results")
      .select("*")
      .eq("web_result_page", selectedPage)
      .order("position");
    if (error) toast.error("Failed to fetch web results");
    else setWebResults(data || []);
  };

  const fetchPrelandings = async () => {
    const { data } = await mingleMoodyClient.from("prelandings").select("*").order("created_at", { ascending: false });
    if (data) setPrelandings(data);
  };

  // Position management functions
  const getTakenPositions = () => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || webResultForm.web_result_page
      : webResultForm.web_result_page;
    return allWebResults
      .filter(wr => wr.web_result_page === pageNum)
      .filter(wr => editingWebResult ? wr.id !== editingWebResult.id : true)
      .map(wr => wr.position);
  };

  const getResultAtPosition = (position: number) => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || webResultForm.web_result_page
      : webResultForm.web_result_page;
    return allWebResults.find(wr => 
      wr.web_result_page === pageNum && 
      wr.position === position &&
      (editingWebResult ? wr.id !== editingWebResult.id : true)
    );
  };

  const takenPositions = getTakenPositions();
  const isPositionTaken = takenPositions.includes(webResultForm.position);
  const existingResultAtPosition = isPositionTaken ? getResultAtPosition(webResultForm.position) : null;

  // Landing Content CRUD
  const handleSaveLanding = async () => {
    if (!landingContent) return;
    const { error } = await mingleMoodyClient
      .from("landing_content")
      .update({ title: landingContent.title, description: landingContent.description, updated_at: new Date().toISOString() })
      .eq("id", landingContent.id);
    if (error) toast.error("Failed to save landing settings");
    else toast.success("Landing settings saved");
  };

  // Related Search CRUD
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...searchForm, title: searchForm.title || searchForm.search_text };

    if (editingSearch) {
      const { error } = await mingleMoodyClient.from("related_searches").update(data).eq("id", editingSearch.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchRelatedSearches(); resetSearchForm(); }
    } else {
      const { error } = await mingleMoodyClient.from("related_searches").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchRelatedSearches(); resetSearchForm(); }
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Delete this search?")) {
      await mingleMoodyClient.from('click_tracking').delete().eq('related_search_id', id);
      const { error } = await mingleMoodyClient.from("related_searches").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchRelatedSearches(); }
    }
  };

  const resetSearchForm = () => {
    setSearchForm({ search_text: "", title: "", web_result_page: 1, position: 1, display_order: 0, is_active: true });
    setEditingSearch(null);
    setSearchDialog(false);
  };

  // Web Result CRUD
  const handleWebResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let pageNumber = webResultForm.web_result_page;
    if (selectedSearchForResult && !editingWebResult) {
      const selectedSearch = relatedSearches.find(s => s.id === selectedSearchForResult);
      if (selectedSearch) pageNumber = selectedSearch.web_result_page;
    }

    // Check if position is taken and force replace is not enabled
    if (isPositionTaken && !forceReplace && !editingWebResult) {
      toast.error('Position is already taken. Enable "Force Replace" to override.');
      return;
    }

    // If force replace is enabled and position is taken, delete existing first
    if (forceReplace && isPositionTaken && existingResultAtPosition) {
      await mingleMoodyClient.from('click_tracking').delete().eq('link_id', existingResultAtPosition.id);
      await mingleMoodyClient.from('link_clicks').delete().eq('web_result_id', existingResultAtPosition.id);
      const { error: deleteError } = await mingleMoodyClient
        .from('web_results')
        .delete()
        .eq('id', existingResultAtPosition.id);
      
      if (deleteError) {
        toast.error('Failed to replace existing result');
        return;
      }
    }
    
    const data = { ...webResultForm, web_result_page: pageNumber, prelanding_key: webResultForm.prelanding_key || null };

    if (editingWebResult) {
      const { error } = await mingleMoodyClient.from("web_results").update(data).eq("id", editingWebResult.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    } else {
      if (!selectedSearchForResult) {
        toast.error("Please select a related search first");
        return;
      }
      const { error } = await mingleMoodyClient.from("web_results").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success(forceReplace && isPositionTaken ? "Replaced" : "Created"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (confirm("Delete this web result?")) {
      await mingleMoodyClient.from('click_tracking').delete().eq('link_id', id);
      await mingleMoodyClient.from('link_clicks').delete().eq('web_result_id', id);
      const { error } = await mingleMoodyClient.from("web_results").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchWebResults(); fetchAllWebResults(); }
    }
  };

  const resetWebResultForm = () => {
    setWebResultForm({
      title: "", description: "", logo_url: "", original_link: "",
      web_result_page: selectedPage, position: 0, prelanding_key: "", is_active: true
    });
    setSelectedSearchForResult("");
    setEditingWebResult(null);
    setForceReplace(false);
    setWebResultDialog(false);
  };

  // Prelanding CRUD
  const generateKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

  const handlePrelandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...prelandingForm, key: editingPrelanding ? prelandingForm.key : generateKey(prelandingForm.headline) };

    if (editingPrelanding) {
      const { error } = await mingleMoodyClient.from("prelandings").update(data).eq("id", editingPrelanding.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchPrelandings(); resetPrelandingForm(); }
    } else {
      const { error } = await mingleMoodyClient.from("prelandings").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchPrelandings(); resetPrelandingForm(); }
    }
  };

  const handleDeletePrelanding = async (id: string) => {
    if (confirm("Delete this prelanding?")) {
      const { error } = await mingleMoodyClient.from("prelandings").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchPrelandings(); }
    }
  };

  const resetPrelandingForm = () => {
    setPrelandingForm({
      key: "", logo_url: "", main_image_url: "", headline: "", subtitle: "",
      description: "", redirect_description: "You will be redirected to...", is_active: true
    });
    setEditingPrelanding(null);
    setPrelandingDialog(false);
  };

  const filteredSearches = relatedSearches.filter(s =>
    s.search_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebResults = webResults.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="bg-[#1a2942] border-[#2a3f5f] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-2xl">🎭</span> MingleMoody Manager
        </CardTitle>
        <CardDescription className="text-gray-400">Manage landing page, related searches, web results, and prelandings</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-[#0d1520]">
            <TabsTrigger value="landing" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Landing</TabsTrigger>
            <TabsTrigger value="searches" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Searches ({relatedSearches.length})</TabsTrigger>
            <TabsTrigger value="webresults" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Web Results ({webResults.length})</TabsTrigger>
            <TabsTrigger value="prelandings" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Prelandings ({prelandings.length})</TabsTrigger>
            <TabsTrigger value="blogs" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Blogs</TabsTrigger>
          </TabsList>

          {/* Landing Tab */}
          <TabsContent value="landing" className="space-y-4">
            {landingContent ? (
              <div className="space-y-4 max-w-xl">
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input
                    value={landingContent.title}
                    onChange={(e) => setLandingContent({ ...landingContent, title: e.target.value })}
                    className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={landingContent.description}
                    onChange={(e) => setLandingContent({ ...landingContent, description: e.target.value })}
                    className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                  />
                </div>
                <Button onClick={handleSaveLanding} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white">Save Settings</Button>
              </div>
            ) : (
              <p className="text-gray-400">No landing settings found.</p>
            )}
          </TabsContent>

          {/* Related Searches Tab */}
          <TabsContent value="searches" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
              </div>
              <Dialog open={searchDialog} onOpenChange={setSearchDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetSearchForm} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"><Plus className="mr-2 h-4 w-4" />New Search</Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2942] border-[#2a3f5f] text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingSearch ? "Edit" : "Create"} Related Search</DialogTitle></DialogHeader>
                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div><Label className="text-gray-300">Search Text *</Label><Input value={searchForm.search_text} onChange={(e) => setSearchForm({ ...searchForm, search_text: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Title</Label><Input value={searchForm.title} onChange={(e) => setSearchForm({ ...searchForm, title: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Web Result Page</Label><Input type="number" value={searchForm.web_result_page} onChange={(e) => setSearchForm({ ...searchForm, web_result_page: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                      <div><Label className="text-gray-300">Position</Label><Input type="number" value={searchForm.position} onChange={(e) => setSearchForm({ ...searchForm, position: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    </div>
                    <div><Label className="text-gray-300">Display Order</Label><Input type="number" value={searchForm.display_order} onChange={(e) => setSearchForm({ ...searchForm, display_order: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={searchForm.is_active} onCheckedChange={(checked) => setSearchForm({ ...searchForm, is_active: checked })} />
                      <Label className="text-gray-300">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">{editingSearch ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetSearchForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <BulkActionToolbar
              selectedCount={selectedSearches.size}
              totalCount={filteredSearches.length}
              onSelectAll={handleSelectAllSearches}
              onDelete={handleBulkDeleteSearches}
              onActivate={handleBulkActivateSearches}
              onDeactivate={handleBulkDeactivateSearches}
              isAllSelected={selectedSearches.size === filteredSearches.length && filteredSearches.length > 0}
              isDarkTheme={true}
            />
            <div className="space-y-2">
              {filteredSearches.map((search) => (
                <div key={search.id} className="flex items-center gap-3 p-4 border border-[#2a3f5f] rounded bg-[#0d1520]">
                  <Checkbox
                    checked={selectedSearches.has(search.id)}
                    onCheckedChange={() => toggleSearchSelection(search.id)}
                    className="border-gray-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs border-[#2a3f5f] text-[#00b4d8]">(Related Search)</Badge>
                      <h3 className="font-semibold text-white">{search.title || search.search_text}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{search.search_text} • Page {search.web_result_page} • Pos {search.position}</p>
                    <span className={`text-xs px-2 py-1 rounded ${search.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                      {search.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                      setEditingSearch(search);
                      setSearchForm({
                        search_text: search.search_text, title: search.title || "",
                        web_result_page: search.web_result_page, position: search.position,
                        display_order: search.display_order, is_active: search.is_active
                      });
                      setSearchDialog(true);
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSearch(search.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {filteredSearches.length === 0 && <p className="text-gray-400 text-center py-8">No related searches found.</p>}
            </div>
          </TabsContent>

          {/* Web Results Tab */}
          <TabsContent value="webresults" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select value={selectedPage.toString()} onValueChange={(v) => setSelectedPage(parseInt(v))}>
                  <SelectTrigger className="w-32 bg-[#0d1520] border-[#2a3f5f] text-white"><SelectValue placeholder="Page" /></SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    {[1, 2, 3, 4, 5].map(p => <SelectItem key={p} value={p.toString()} className="text-white hover:bg-[#2a3f5f]">Page {p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" />
                </div>
              </div>
              <Dialog open={webResultDialog} onOpenChange={setWebResultDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetWebResultForm} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"><Plus className="mr-2 h-4 w-4" />Add Result</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingWebResult ? "Edit" : "Create"} Web Result</DialogTitle></DialogHeader>
                  <form onSubmit={handleWebResultSubmit} className="space-y-4">
                    {!editingWebResult && (
                      <div>
                        <Label className="text-gray-300">Select Related Search *</Label>
                        <Select value={selectedSearchForResult} onValueChange={setSelectedSearchForResult}>
                          <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                            <SelectValue placeholder="Choose a related search..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                            {relatedSearches.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-white hover:bg-[#2a3f5f]">
                                <span className="text-[#00b4d8] mr-2">(Related Search)</span>
                                {s.title || s.search_text} → WR Page {s.web_result_page}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedSearchForResult && (
                          <p className="text-xs text-gray-400 mt-1">
                            Web result will be added to Page {relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || 1}
                          </p>
                        )}
                      </div>
                    )}
                    <div><Label className="text-gray-300">Title *</Label><Input value={webResultForm.title} onChange={(e) => setWebResultForm({ ...webResultForm, title: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Description</Label><Textarea value={webResultForm.description} onChange={(e) => setWebResultForm({ ...webResultForm, description: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" /></div>
                    <div><Label className="text-gray-300">Logo URL</Label><Input value={webResultForm.logo_url} onChange={(e) => setWebResultForm({ ...webResultForm, logo_url: e.target.value })} placeholder="https://..." className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" /></div>
                    <div><Label className="text-gray-300">Original Link *</Label><Input value={webResultForm.original_link} onChange={(e) => setWebResultForm({ ...webResultForm, original_link: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Page {!editingWebResult && "(Auto)"}</Label>
                        {editingWebResult ? (
                          <Input type="number" value={webResultForm.web_result_page} onChange={(e) => setWebResultForm({ ...webResultForm, web_result_page: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" />
                        ) : (
                          <div className="p-2 rounded border bg-[#0d1520] border-[#2a3f5f] text-gray-400">
                            {selectedSearchForResult ? `Page ${relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || 1}` : "Select search first"}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-300">Position</Label>
                        <Input type="number" value={webResultForm.position} onChange={(e) => setWebResultForm({ ...webResultForm, position: parseInt(e.target.value) || 0 })} className={`bg-[#0d1520] border-[#2a3f5f] text-white ${isPositionTaken ? 'border-yellow-500' : ''}`} />
                        <p className="text-xs text-gray-400 mt-1">This result will appear at position #{webResultForm.position}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-gray-400 mr-2">Positions:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setWebResultForm({ ...webResultForm, position: pos })}
                              className={`w-6 h-6 text-xs rounded ${
                                takenPositions.includes(pos)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-green-500 text-white'
                              } ${webResultForm.position === pos ? 'ring-2 ring-[#00b4d8]' : ''}`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                        {isPositionTaken && existingResultAtPosition && !editingWebResult && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Position {webResultForm.position} is taken by: "{existingResultAtPosition.title}"</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Checkbox
                                id="forceReplace"
                                checked={forceReplace}
                                onCheckedChange={(checked) => setForceReplace(checked === true)}
                              />
                              <Label htmlFor="forceReplace" className="text-sm text-yellow-400">Force replace existing result</Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div><Label className="text-gray-300">Prelanding Key</Label><Input value={webResultForm.prelanding_key} onChange={(e) => setWebResultForm({ ...webResultForm, prelanding_key: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={webResultForm.is_active} onCheckedChange={(checked) => setWebResultForm({ ...webResultForm, is_active: checked })} />
                      <Label className="text-gray-300">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">{editingWebResult ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetWebResultForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <BulkActionToolbar
              selectedCount={selectedWebResults.size}
              totalCount={filteredWebResults.length}
              onSelectAll={handleSelectAllWebResults}
              onDelete={handleBulkDeleteWebResults}
              onActivate={handleBulkActivateWebResults}
              onDeactivate={handleBulkDeactivateWebResults}
              isAllSelected={selectedWebResults.size === filteredWebResults.length && filteredWebResults.length > 0}
              isDarkTheme={true}
            />
            <div className="space-y-2">
              {filteredWebResults.map((result) => {
                const hasPrelander = result.prelanding_key && prelandings.some(p => p.key === result.prelanding_key);
                return (
                  <div key={result.id} className={`flex items-center justify-between p-4 border border-[#2a3f5f] rounded bg-[#0d1520] ${selectedWebResults.has(result.id) ? 'ring-2 ring-[#00b4d8]' : ''}`}>
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedWebResults.has(result.id)}
                        onCheckedChange={() => toggleWebResultSelection(result.id)}
                        className="border-gray-500"
                      />
                      {result.logo_url && <img src={result.logo_url} alt="" className="w-10 h-10 rounded object-contain" />}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs border-[#2a3f5f] text-[#00b4d8]">(Web Result)</Badge>
                          <h3 className="font-semibold text-white">{result.title}</h3>
                          {hasPrelander && <Badge className="text-xs bg-green-600 text-white">Has Pre-landing</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 truncate max-w-md">{result.description}</p>
                        <p className="text-xs text-gray-500">Position: {result.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${result.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                        {result.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                        setEditingWebResult(result);
                        setWebResultForm({
                          title: result.title, description: result.description || "",
                          logo_url: result.logo_url || "", original_link: result.original_link,
                          web_result_page: result.web_result_page, position: result.position,
                          is_active: result.is_active, prelanding_key: result.prelanding_key || ""
                        });
                        setWebResultDialog(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteWebResult(result.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              {filteredWebResults.length === 0 && <p className="text-gray-400 text-center py-8">No web results found for page {selectedPage}.</p>}
            </div>
          </TabsContent>

          {/* Prelandings Tab */}
          <TabsContent value="prelandings" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={prelandingDialog} onOpenChange={setPrelandingDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetPrelandingForm} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"><Plus className="mr-2 h-4 w-4" />New Prelanding</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingPrelanding ? "Edit" : "Create"} Prelanding</DialogTitle></DialogHeader>
                  <form onSubmit={handlePrelandingSubmit} className="space-y-4">
                    <div><Label className="text-gray-300">Headline *</Label><Input value={prelandingForm.headline} onChange={(e) => setPrelandingForm({ ...prelandingForm, headline: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Subtitle</Label><Input value={prelandingForm.subtitle} onChange={(e) => setPrelandingForm({ ...prelandingForm, subtitle: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Description</Label><Textarea value={prelandingForm.description} onChange={(e) => setPrelandingForm({ ...prelandingForm, description: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Logo URL</Label><Input value={prelandingForm.logo_url} onChange={(e) => setPrelandingForm({ ...prelandingForm, logo_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Main Image URL</Label><Input value={prelandingForm.main_image_url} onChange={(e) => setPrelandingForm({ ...prelandingForm, main_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Redirect Description</Label><Input value={prelandingForm.redirect_description} onChange={(e) => setPrelandingForm({ ...prelandingForm, redirect_description: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={prelandingForm.is_active} onCheckedChange={(checked) => setPrelandingForm({ ...prelandingForm, is_active: checked })} />
                      <Label className="text-gray-300">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">{editingPrelanding ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetPrelandingForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {prelandings.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border border-[#2a3f5f] rounded bg-[#0d1520]">
                  <div>
                    <h3 className="font-semibold text-white">{p.headline}</h3>
                    <p className="text-sm text-gray-400">Key: {p.key}</p>
                    <span className={`text-xs px-2 py-1 rounded ${p.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                      setEditingPrelanding(p);
                      setPrelandingForm({
                        key: p.key, logo_url: p.logo_url || "", main_image_url: p.main_image_url || "",
                        headline: p.headline, subtitle: p.subtitle || "", description: p.description || "",
                        redirect_description: p.redirect_description || "", is_active: p.is_active
                      });
                      setPrelandingDialog(true);
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePrelanding(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {prelandings.length === 0 && <p className="text-gray-400 text-center py-8">No prelandings found.</p>}
            </div>
          </TabsContent>

          {/* Blogs Tab */}
          <TabsContent value="blogs" className="space-y-4">
            <MingleMoodyBlogs />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
