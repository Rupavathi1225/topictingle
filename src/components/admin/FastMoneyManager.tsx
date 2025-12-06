import { useState, useEffect } from "react";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string;
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
  display_order: number;
  is_active: boolean;
  is_sponsored: boolean;
  country_permissions: string[];
  fallback_link: string | null;
}

interface LandingSettings {
  id: string;
  site_name: string;
  title: string;
  description: string;
}

interface PrelanderSettings {
  id: string;
  web_result_id: string;
  is_enabled: boolean;
  logo_url: string | null;
  main_image_url: string | null;
  headline_text: string;
  description_text: string;
  email_placeholder: string;
  button_text: string;
  button_color: string;
  background_color: string;
  background_image_url: string | null;
}

const COUNTRIES = [
  { code: 'worldwide', name: 'Worldwide' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
];

interface FastMoneyManagerProps {
  initialTab?: string;
}

export const FastMoneyManager = ({ initialTab = "landing" }: FastMoneyManagerProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      const tabMap: Record<string, string> = {
        'landing': 'landing',
        'searches': 'searches',
        'webresults': 'webresults',
        'prelanding': 'prelandings'
      };
      setActiveTab(tabMap[initialTab] || initialTab);
    }
  }, [initialTab]);

  // Landing Settings
  const [landingSettings, setLandingSettings] = useState<LandingSettings | null>(null);

  // Related Searches
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [searchForm, setSearchForm] = useState({
    search_text: "", title: "", web_result_page: 1, position: 1, display_order: 0, is_active: true
  });

  // Web Results
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [allWebResults, setAllWebResults] = useState<WebResult[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [webResultDialog, setWebResultDialog] = useState(false);
  const [editingWebResult, setEditingWebResult] = useState<WebResult | null>(null);
  const [selectedSearchForResult, setSelectedSearchForResult] = useState<string>("");
  const [forceReplace, setForceReplace] = useState(false);
  const [selectedWebResults, setSelectedWebResults] = useState<Set<string>>(new Set());
  const [webResultForm, setWebResultForm] = useState({
    title: "", description: "", logo_url: "", original_link: "",
    web_result_page: 1, display_order: 0, is_active: true, is_sponsored: false,
    country_permissions: ["worldwide"] as string[], fallback_link: ""
  });

  // Prelander Settings
  const [prelanders, setPrelanders] = useState<PrelanderSettings[]>([]);
  const [prelanderDialog, setPrelanderDialog] = useState(false);
  const [editingPrelander, setEditingPrelander] = useState<PrelanderSettings | null>(null);
  const [prelanderForm, setPrelanderForm] = useState({
    web_result_id: "", is_enabled: false, logo_url: "", main_image_url: "",
    headline_text: "Welcome to Our Platform", description_text: "Join thousands of users already benefiting from our service.",
    email_placeholder: "Enter your email", button_text: "Get Started Now",
    button_color: "#00b4d8", background_color: "#0a0f1c", background_image_url: ""
  });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === "webresults") fetchWebResults();
  }, [selectedPage]);

  const fetchAll = async () => {
    await Promise.all([
      fetchLandingSettings(),
      fetchRelatedSearches(),
      fetchWebResults(),
      fetchAllWebResults(),
      fetchPrelanders()
    ]);
  };

  const fetchLandingSettings = async () => {
    const { data, error } = await fastMoneyClient.from("landing_settings").select("*").maybeSingle();
    if (error) console.error("Failed to fetch landing settings:", error);
    else setLandingSettings(data);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await fastMoneyClient.from("related_searches").select("*").order("display_order");
    if (error) toast.error("Failed to fetch related searches");
    else setRelatedSearches(data || []);
  };

  const fetchAllWebResults = async () => {
    const { data, error } = await fastMoneyClient.from("web_results").select("*").order("display_order");
    if (error) console.error("Failed to fetch all web results:", error);
    else setAllWebResults(data || []);
  };

  const fetchWebResults = async () => {
    const { data, error } = await fastMoneyClient
      .from("web_results")
      .select("*")
      .eq("web_result_page", selectedPage)
      .order("display_order");
    if (error) toast.error("Failed to fetch web results");
    else setWebResults(data || []);
  };

  const fetchPrelanders = async () => {
    const { data, error } = await fastMoneyClient.from("prelander_settings").select("*");
    if (error) console.error("Failed to fetch prelanders:", error);
    else setPrelanders(data || []);
  };

  // Position management functions
  const getTakenPositions = () => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || webResultForm.web_result_page
      : webResultForm.web_result_page;
    return allWebResults
      .filter(wr => wr.web_result_page === pageNum)
      .filter(wr => editingWebResult ? wr.id !== editingWebResult.id : true)
      .map(wr => wr.display_order);
  };

  const getResultAtPosition = (position: number) => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || webResultForm.web_result_page
      : webResultForm.web_result_page;
    return allWebResults.find(wr => 
      wr.web_result_page === pageNum && 
      wr.display_order === position &&
      (editingWebResult ? wr.id !== editingWebResult.id : true)
    );
  };

  const takenPositions = getTakenPositions();
  const isPositionTaken = takenPositions.includes(webResultForm.display_order);
  const existingResultAtPosition = isPositionTaken ? getResultAtPosition(webResultForm.display_order) : null;

  // Landing Settings CRUD
  const handleSaveLanding = async () => {
    if (!landingSettings) return;
    const { error } = await fastMoneyClient
      .from("landing_settings")
      .update({
        title: landingSettings.title,
        description: landingSettings.description,
        updated_at: new Date().toISOString()
      })
      .eq("id", landingSettings.id);
    if (error) toast.error("Failed to save landing settings");
    else toast.success("Landing settings saved");
  };

  // Related Search CRUD
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...searchForm };

    if (editingSearch) {
      const { error } = await fastMoneyClient.from("related_searches").update({
        ...data, updated_at: new Date().toISOString()
      }).eq("id", editingSearch.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchRelatedSearches(); resetSearchForm(); }
    } else {
      const { error } = await fastMoneyClient.from("related_searches").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchRelatedSearches(); resetSearchForm(); }
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Delete this search?")) {
      const { error } = await fastMoneyClient.from("related_searches").delete().eq("id", id);
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
    
    // Get page from selected related search (not from form)
    let pageNumber = webResultForm.web_result_page;
    if (selectedSearchForResult && !editingWebResult) {
      const selectedSearch = relatedSearches.find(s => s.id === selectedSearchForResult);
      if (selectedSearch) {
        pageNumber = selectedSearch.web_result_page;
      }
    }

    // Check if position is taken and force replace is not enabled
    if (isPositionTaken && !forceReplace && !editingWebResult) {
      toast.error('Position is already taken. Enable "Force Replace" to override.');
      return;
    }

    // If force replace is enabled and position is taken, delete existing first
    if (forceReplace && isPositionTaken && existingResultAtPosition) {
      const { error: deleteError } = await fastMoneyClient
        .from('web_results')
        .delete()
        .eq('id', existingResultAtPosition.id);
      
      if (deleteError) {
        toast.error('Failed to replace existing result');
        return;
      }
    }
    
    const data = { ...webResultForm, web_result_page: pageNumber };

    if (editingWebResult) {
      const { error } = await fastMoneyClient.from("web_results").update({
        ...data, updated_at: new Date().toISOString()
      }).eq("id", editingWebResult.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    } else {
      if (!selectedSearchForResult) {
        toast.error("Please select a related search first");
        return;
      }
      const { error } = await fastMoneyClient.from("web_results").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success(forceReplace && isPositionTaken ? "Replaced" : "Created"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (confirm("Delete this web result?")) {
      const { error } = await fastMoneyClient.from("web_results").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchWebResults(); fetchAllWebResults(); }
    }
  };

  const resetWebResultForm = () => {
    setWebResultForm({
      title: "", description: "", logo_url: "", original_link: "",
      web_result_page: selectedPage, display_order: 0, is_active: true, is_sponsored: false,
      country_permissions: ["worldwide"], fallback_link: ""
    });
    setSelectedSearchForResult("");
    setEditingWebResult(null);
    setForceReplace(false);
    setWebResultDialog(false);
    setSelectedWebResults(new Set());
  };

  // Prelander CRUD
  const handlePrelanderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...prelanderForm };

    if (editingPrelander) {
      const { error } = await fastMoneyClient.from("prelander_settings").update(data).eq("id", editingPrelander.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchPrelanders(); resetPrelanderForm(); }
    } else {
      const { error } = await fastMoneyClient.from("prelander_settings").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchPrelanders(); resetPrelanderForm(); }
    }
  };

  const handleDeletePrelander = async (id: string) => {
    if (confirm("Delete this prelander?")) {
      const { error } = await fastMoneyClient.from("prelander_settings").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchPrelanders(); }
    }
  };

  const resetPrelanderForm = () => {
    setPrelanderForm({
      web_result_id: "", is_enabled: false, logo_url: "", main_image_url: "",
      headline_text: "Welcome to Our Platform", description_text: "Join thousands of users already benefiting from our service.",
      email_placeholder: "Enter your email", button_text: "Get Started Now",
      button_color: "#00b4d8", background_color: "#0a0f1c", background_image_url: ""
    });
    setEditingPrelander(null);
    setPrelanderDialog(false);
  };

  const filteredSearches = relatedSearches.filter(s =>
    s.search_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebResults = webResults.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bulk actions for web results
  const handleSelectAllWebResults = () => {
    if (selectedWebResults.size === filteredWebResults.length) {
      setSelectedWebResults(new Set());
    } else {
      setSelectedWebResults(new Set(filteredWebResults.map(wr => wr.id)));
    }
  };

  const handleDeleteSelectedWebResults = async () => {
    if (selectedWebResults.size === 0) return;
    if (!confirm(`Delete ${selectedWebResults.size} selected web result(s)?`)) return;
    
    for (const id of selectedWebResults) {
      await fastMoneyClient.from("web_results").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
    fetchAllWebResults();
  };

  const handleActivateAllWebResults = async () => {
    if (selectedWebResults.size === 0) {
      // Activate all on current page
      for (const wr of filteredWebResults) {
        await fastMoneyClient.from("web_results").update({ is_active: true }).eq("id", wr.id);
      }
      toast.success(`Activated all web results on page ${selectedPage}`);
    } else {
      // Activate selected only
      for (const id of selectedWebResults) {
        await fastMoneyClient.from("web_results").update({ is_active: true }).eq("id", id);
      }
      toast.success(`Activated ${selectedWebResults.size} web result(s)`);
    }
    setSelectedWebResults(new Set());
    fetchWebResults();
    fetchAllWebResults();
  };

  const toggleWebResultSelection = (id: string) => {
    const newSelection = new Set(selectedWebResults);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWebResults(newSelection);
  };

  return (
    <Card className="bg-[#1a2942] border-[#2a3f5f] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-2xl">💰</span> FastMoney Manager
        </CardTitle>
        <CardDescription className="text-gray-400">Manage landing page, related searches, web results, and prelanders</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[#0d1520]">
            <TabsTrigger value="landing" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Landing</TabsTrigger>
            <TabsTrigger value="searches" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Searches ({relatedSearches.length})</TabsTrigger>
            <TabsTrigger value="webresults" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Web Results ({webResults.length})</TabsTrigger>
            <TabsTrigger value="prelanders" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Prelanders ({prelanders.length})</TabsTrigger>
          </TabsList>

          {/* Landing Tab */}
          <TabsContent value="landing" className="space-y-4">
            {landingSettings ? (
              <div className="space-y-4 max-w-xl">
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input
                    value={landingSettings.title}
                    onChange={(e) => setLandingSettings({ ...landingSettings, title: e.target.value })}
                    className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={landingSettings.description}
                    onChange={(e) => setLandingSettings({ ...landingSettings, description: e.target.value })}
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
                    <div><Label className="text-gray-300">Title *</Label><Input value={searchForm.title} onChange={(e) => setSearchForm({ ...searchForm, title: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
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
            <div className="space-y-2">
              {filteredSearches.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-4 border border-[#2a3f5f] rounded bg-[#0d1520]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs border-[#2a3f5f] text-[#00b4d8]">(Related Search)</Badge>
                      <h3 className="font-semibold text-white">{search.title}</h3>
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
                        search_text: search.search_text, title: search.title,
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
                  <Button onClick={() => { resetWebResultForm(); }} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"><Plus className="mr-2 h-4 w-4" />Add Result</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingWebResult ? "Edit" : "Create"} Web Result</DialogTitle></DialogHeader>
                  <form onSubmit={handleWebResultSubmit} className="space-y-4">
                    {/* Related Search Selection (only for new, not editing) */}
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
                                {s.title} → WR Page {s.web_result_page}
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
                    <div><Label className="text-gray-300">Logo URL (optional)</Label><Input value={webResultForm.logo_url} onChange={(e) => setWebResultForm({ ...webResultForm, logo_url: e.target.value })} placeholder="https://..." className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" /></div>
                    <div><Label className="text-gray-300">Original Link *</Label><Input value={webResultForm.original_link} onChange={(e) => setWebResultForm({ ...webResultForm, original_link: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Fallback Link</Label><Input value={webResultForm.fallback_link} onChange={(e) => setWebResultForm({ ...webResultForm, fallback_link: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Page: read-only for new (auto from search), editable for edit */}
                      <div>
                        <Label className="text-gray-300">Page {!editingWebResult && "(Auto from Related Search)"}</Label>
                        {editingWebResult ? (
                          <Input type="number" value={webResultForm.web_result_page} onChange={(e) => setWebResultForm({ ...webResultForm, web_result_page: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" />
                        ) : (
                          <div className="p-2 rounded border bg-[#0d1520] border-[#2a3f5f] text-gray-400">
                            {selectedSearchForResult ? `Page ${relatedSearches.find(s => s.id === selectedSearchForResult)?.web_result_page || 1}` : "Select a related search first"}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-300">Display Order (Position)</Label>
                        <Input type="number" value={webResultForm.display_order} onChange={(e) => setWebResultForm({ ...webResultForm, display_order: parseInt(e.target.value) || 0 })} className={`bg-[#0d1520] border-[#2a3f5f] text-white ${isPositionTaken ? 'border-yellow-500' : ''}`} />
                        <p className="text-xs text-gray-400 mt-1">This result will appear at position #{webResultForm.display_order}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-gray-400 mr-2">Positions:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setWebResultForm({ ...webResultForm, display_order: pos })}
                              className={`w-6 h-6 text-xs rounded ${
                                takenPositions.includes(pos)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-green-500 text-white'
                              } ${webResultForm.display_order === pos ? 'ring-2 ring-[#00b4d8]' : ''}`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                        {isPositionTaken && existingResultAtPosition && !editingWebResult && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Position {webResultForm.display_order} is taken by: "{existingResultAtPosition.title}"</span>
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
                    <div>
                      <Label className="text-gray-300">Country Permissions</Label>
                      <Select
                        value={webResultForm.country_permissions[0]}
                        onValueChange={(v) => setWebResultForm({ ...webResultForm, country_permissions: [v] })}
                      >
                        <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                          {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code} className="text-white hover:bg-[#2a3f5f]">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={webResultForm.is_active} onCheckedChange={(checked) => setWebResultForm({ ...webResultForm, is_active: checked })} />
                        <Label className="text-gray-300">Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={webResultForm.is_sponsored} onCheckedChange={(checked) => setWebResultForm({ ...webResultForm, is_sponsored: checked })} />
                        <Label className="text-gray-300">Sponsored</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">{editingWebResult ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetWebResultForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAllWebResults}
                className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
              >
                {selectedWebResults.size === filteredWebResults.length && filteredWebResults.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelectedWebResults}
                disabled={selectedWebResults.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected ({selectedWebResults.size})
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleActivateAllWebResults}
                className="border-green-600 text-green-400 hover:bg-green-900/30"
              >
                Make All Active
              </Button>
            </div>

            <div className="space-y-2">
              {filteredWebResults.map((result) => {
                const hasPrelander = prelanders.some(p => p.web_result_id === result.id);
                return (
                <div key={result.id} className={`flex items-center justify-between p-4 border rounded bg-[#0d1520] ${selectedWebResults.has(result.id) ? 'border-[#00b4d8]' : 'border-[#2a3f5f]'}`}>
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedWebResults.has(result.id)}
                      onCheckedChange={() => toggleWebResultSelection(result.id)}
                    />
                    {result.logo_url && <img src={result.logo_url} alt="" className="w-10 h-10 rounded object-contain" />}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs border-[#2a3f5f] text-[#00b4d8]">(Web Result)</Badge>
                        <h3 className="font-semibold text-white">{result.title}</h3>
                        {result.is_sponsored && (
                          <Badge className="text-xs bg-amber-600 text-white">Sponsored</Badge>
                        )}
                        {hasPrelander && (
                          <Badge className="text-xs bg-green-600 text-white">Has Pre-landing</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate max-w-md">{result.description}</p>
                      <p className="text-xs text-gray-500">Order: {result.display_order} • {result.country_permissions?.join(", ")}</p>
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
                        web_result_page: result.web_result_page, display_order: result.display_order,
                        is_active: result.is_active, is_sponsored: result.is_sponsored || false, country_permissions: result.country_permissions || ["worldwide"],
                        fallback_link: result.fallback_link || ""
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

          {/* Prelanders Tab */}
          <TabsContent value="prelanders" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={prelanderDialog} onOpenChange={setPrelanderDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetPrelanderForm} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"><Plus className="mr-2 h-4 w-4" />New Prelander</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingPrelander ? "Edit" : "Create"} Prelander</DialogTitle></DialogHeader>
                  <form onSubmit={handlePrelanderSubmit} className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Web Result</Label>
                      <Select value={prelanderForm.web_result_id} onValueChange={(v) => setPrelanderForm({ ...prelanderForm, web_result_id: v })}>
                        <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white"><SelectValue placeholder="Select web result" /></SelectTrigger>
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                          {webResults.map(wr => {
                            const hasPrelander = prelanders.some(p => p.web_result_id === wr.id);
                            return (
                              <SelectItem key={wr.id} value={wr.id} className="text-white hover:bg-[#2a3f5f]">
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">(Web Result)</Badge>
                                  {wr.title}
                                  {hasPrelander && (
                                    <Badge className="text-xs bg-green-600">Has Pre-landing</Badge>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={prelanderForm.is_enabled} onCheckedChange={(checked) => setPrelanderForm({ ...prelanderForm, is_enabled: checked })} />
                      <Label className="text-gray-300">Enabled</Label>
                    </div>
                    <div><Label className="text-gray-300">Logo URL</Label><Input value={prelanderForm.logo_url} onChange={(e) => setPrelanderForm({ ...prelanderForm, logo_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Main Image URL</Label><Input value={prelanderForm.main_image_url} onChange={(e) => setPrelanderForm({ ...prelanderForm, main_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Headline Text</Label><Input value={prelanderForm.headline_text} onChange={(e) => setPrelanderForm({ ...prelanderForm, headline_text: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Description Text</Label><Textarea value={prelanderForm.description_text} onChange={(e) => setPrelanderForm({ ...prelanderForm, description_text: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Email Placeholder</Label><Input value={prelanderForm.email_placeholder} onChange={(e) => setPrelanderForm({ ...prelanderForm, email_placeholder: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Button Text</Label><Input value={prelanderForm.button_text} onChange={(e) => setPrelanderForm({ ...prelanderForm, button_text: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Button Color</Label><Input type="color" value={prelanderForm.button_color} onChange={(e) => setPrelanderForm({ ...prelanderForm, button_color: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] h-10" /></div>
                      <div><Label className="text-gray-300">Background Color</Label><Input type="color" value={prelanderForm.background_color} onChange={(e) => setPrelanderForm({ ...prelanderForm, background_color: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] h-10" /></div>
                    </div>
                    <div><Label className="text-gray-300">Background Image URL</Label><Input value={prelanderForm.background_image_url} onChange={(e) => setPrelanderForm({ ...prelanderForm, background_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">{editingPrelander ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetPrelanderForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {prelanders.map((p) => {
                const wr = webResults.find(w => w.id === p.web_result_id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 border border-[#2a3f5f] rounded bg-[#0d1520]">
                    <div>
                      <h3 className="font-semibold text-white">{p.headline_text}</h3>
                      <p className="text-sm text-gray-400">Web Result: {wr?.title || 'N/A'}</p>
                      <span className={`text-xs px-2 py-1 rounded ${p.is_enabled ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                        {p.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                        setEditingPrelander(p);
                        setPrelanderForm({
                          web_result_id: p.web_result_id, is_enabled: p.is_enabled,
                          logo_url: p.logo_url || "", main_image_url: p.main_image_url || "",
                          headline_text: p.headline_text, description_text: p.description_text,
                          email_placeholder: p.email_placeholder, button_text: p.button_text,
                          button_color: p.button_color, background_color: p.background_color,
                          background_image_url: p.background_image_url || ""
                        });
                        setPrelanderDialog(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeletePrelander(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              {prelanders.length === 0 && <p className="text-gray-400 text-center py-8">No prelanders found.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
