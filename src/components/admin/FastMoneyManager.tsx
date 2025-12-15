import { useState, useEffect } from "react";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, ChevronRight, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { FastMoneyBlogs } from "./FastMoneyBlogs";

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string;
  web_result_page: number;
  position: number;
  display_order: number;
  is_active: boolean;
  blog_id: string | null;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
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
        'prelanding': 'prelandings',
        'blogs': 'blogs'
      };
      setActiveTab(tabMap[initialTab] || initialTab);
    }
  }, [initialTab]);

  // Landing Settings
  const [landingSettings, setLandingSettings] = useState<LandingSettings | null>(null);

  // Related Searches
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [searchForm, setSearchForm] = useState({
    search_text: "", title: "", web_result_page: 1, position: 1, display_order: 0, is_active: true, blog_id: "" as string | null
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

  // AI Web Results Generation
  interface GeneratedResult {
    title: string;
    description: string;
    link: string;
    targetPage: number;
    selected: boolean;
    isSponsored: boolean;
  }
  const [selectedRelatedSearchForAI, setSelectedRelatedSearchForAI] = useState<string>("");
  const [isGeneratingWebResults, setIsGeneratingWebResults] = useState(false);
  const [generatedWebResults, setGeneratedWebResults] = useState<GeneratedResult[]>([]);

  // Prelander Settings
  const [prelanders, setPrelanders] = useState<PrelanderSettings[]>([]);
  const [prelanderDialog, setPrelanderDialog] = useState(false);
  const [editingPrelander, setEditingPrelander] = useState<PrelanderSettings | null>(null);
  const [isGeneratingPrelanding, setIsGeneratingPrelanding] = useState(false);
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
      fetchPrelanders(),
      fetchBlogs()
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

  const fetchBlogs = async () => {
    const { data, error } = await fastMoneyClient.from("blogs").select("id, title, slug").order("title");
    if (error) console.error("Failed to fetch blogs:", error);
    else setBlogs(data || []);
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
    const data = { 
      ...searchForm,
      blog_id: searchForm.blog_id || null
    };

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
    setSearchForm({ search_text: "", title: "", web_result_page: 1, position: 1, display_order: 0, is_active: true, blog_id: null });
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
    setIsGeneratingPrelanding(false);
  };

  // AI Web Results Generation
  const generateWebResultsWithAI = async () => {
    if (!selectedRelatedSearchForAI) {
      toast.error("Please select a related search first");
      return;
    }

    const selectedSearch = relatedSearches.find(s => s.id === selectedRelatedSearchForAI);
    if (!selectedSearch) return;

    setIsGeneratingWebResults(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-web-results', {
        body: { searchText: selectedSearch.title, count: 6 }
      });

      if (error) throw error;

      const generated = (data.webResults || []).map((r: any) => ({
        title: r.title || '',
        description: r.description || '',
        link: r.url || '',
        targetPage: selectedSearch.web_result_page,
        selected: true,
        isSponsored: r.is_sponsored || false,
      }));

      setGeneratedWebResults(generated);
      toast.success("Generated 6 web results. Select which ones to save.");
    } catch (error) {
      console.error('Error generating web results:', error);
      toast.error("Failed to generate web results");
    } finally {
      setIsGeneratingWebResults(false);
    }
  };

  const saveGeneratedWebResults = async () => {
    const toSave = generatedWebResults.filter(r => r.selected);
    if (toSave.length === 0) {
      toast.error("Please select at least one result to save");
      return;
    }

    if (toSave.length > 4) {
      toast.error("You can only save up to 4 results at a time");
      return;
    }

    const missingLinks = toSave.filter(r => !r.link.trim());
    if (missingLinks.length > 0) {
      toast.error("Please enter a link URL for all selected results");
      return;
    }

    try {
      const inserts = toSave.map((r, idx) => ({
        title: r.title,
        description: r.description,
        original_link: r.link,
        web_result_page: r.targetPage,
        display_order: idx,
        is_active: true,
        is_sponsored: r.isSponsored,
        country_permissions: ["worldwide"],
      }));

      const { error } = await fastMoneyClient.from('web_results').insert(inserts);
      if (error) throw error;

      toast.success(`Saved ${toSave.length} web results`);
      setGeneratedWebResults([]);
      setSelectedRelatedSearchForAI("");
      fetchWebResults();
      fetchAllWebResults();
    } catch (error) {
      console.error('Error saving web results:', error);
      toast.error("Failed to save web results");
    }
  };

  // AI Prelanding Generation
  const generatePrelandingWithAI = async () => {
    if (!prelanderForm.web_result_id) {
      toast.error("Please select a web result first");
      return;
    }

    const selectedResult = allWebResults.find(wr => wr.id === prelanderForm.web_result_id);
    if (!selectedResult) return;

    setIsGeneratingPrelanding(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-prelanding-content', {
        body: {
          webResultTitle: selectedResult.title,
          webResultDescription: selectedResult.description,
          originalLink: selectedResult.original_link
        }
      });

      if (error) throw error;

      setPrelanderForm(prev => ({
        ...prev,
        headline_text: data.headline || prev.headline_text,
        description_text: data.description || prev.description_text,
        email_placeholder: data.emailPlaceholder || data.email_placeholder || prev.email_placeholder,
        button_text: data.buttonText || data.button_text || prev.button_text,
        main_image_url: data.main_image_url || prev.main_image_url,
        background_color: data.backgroundColor || data.background_color || prev.background_color,
        button_color: data.buttonColor || data.button_color || prev.button_color,
        is_enabled: true,
      }));

      toast.success("Prelanding content generated with AI!");
    } catch (error) {
      console.error('Error generating prelanding:', error);
      toast.error("Failed to generate prelanding content");
    } finally {
      setIsGeneratingPrelanding(false);
    }
  };

  const filteredSearches = relatedSearches.filter(s =>
    s.search_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebResults = webResults.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bulk actions for searches
  const handleSelectAllSearches = () => {
    if (selectedSearches.size === filteredSearches.length) {
      setSelectedSearches(new Set());
    } else {
      setSelectedSearches(new Set(filteredSearches.map(s => s.id)));
    }
  };

  const handleDeleteSelectedSearches = async () => {
    if (selectedSearches.size === 0) return;
    if (!confirm(`Delete ${selectedSearches.size} selected search(es)?`)) return;
    for (const id of selectedSearches) {
      await fastMoneyClient.from("related_searches").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleActivateSearches = async () => {
    if (selectedSearches.size === 0) return;
    for (const id of selectedSearches) {
      await fastMoneyClient.from("related_searches").update({ is_active: true }).eq("id", id);
    }
    toast.success(`Activated ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleDeactivateSearches = async () => {
    if (selectedSearches.size === 0) return;
    for (const id of selectedSearches) {
      await fastMoneyClient.from("related_searches").update({ is_active: false }).eq("id", id);
    }
    toast.success(`Deactivated ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const toggleSearchSelection = (id: string) => {
    const newSelection = new Set(selectedSearches);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSearches(newSelection);
  };

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

  const handleActivateWebResults = async () => {
    if (selectedWebResults.size === 0) return;
    for (const id of selectedWebResults) {
      await fastMoneyClient.from("web_results").update({ is_active: true }).eq("id", id);
    }
    toast.success(`Activated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
    fetchAllWebResults();
  };

  const handleDeactivateWebResults = async () => {
    if (selectedWebResults.size === 0) return;
    for (const id of selectedWebResults) {
      await fastMoneyClient.from("web_results").update({ is_active: false }).eq("id", id);
    }
    toast.success(`Deactivated ${selectedWebResults.size} web result(s)`);
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
          <TabsList className="grid w-full grid-cols-5 bg-[#0d1520]">
            <TabsTrigger value="landing" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Landing</TabsTrigger>
            <TabsTrigger value="searches" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Searches ({relatedSearches.length})</TabsTrigger>
            <TabsTrigger value="webresults" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Web Results ({webResults.length})</TabsTrigger>
            <TabsTrigger value="prelanders" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Prelanders ({prelanders.length})</TabsTrigger>
            <TabsTrigger value="blogs" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">Blogs</TabsTrigger>
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
                    <div>
                      <Label className="text-gray-300">Blog (optional)</Label>
                      <Select value={searchForm.blog_id || "no_blog"} onValueChange={(value) => setSearchForm({ ...searchForm, blog_id: value === "no_blog" ? null : value })}>
                        <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                          <SelectValue placeholder="No blog (Landing page)" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                          <SelectItem value="no_blog" className="text-white hover:bg-[#2a3f5f]">No blog (Landing page)</SelectItem>
                          {blogs.map(blog => (
                            <SelectItem key={blog.id} value={blog.id} className="text-white hover:bg-[#2a3f5f]">{blog.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

            <BulkActionToolbar
              selectedCount={selectedSearches.size}
              totalCount={filteredSearches.length}
              onSelectAll={handleSelectAllSearches}
              onDelete={handleDeleteSelectedSearches}
              onActivate={handleActivateSearches}
              onDeactivate={handleDeactivateSearches}
              isAllSelected={selectedSearches.size === filteredSearches.length && filteredSearches.length > 0}
              isDarkTheme={true}
              selectedData={filteredSearches.filter(s => selectedSearches.has(s.id))}
              allData={relatedSearches}
              csvColumns={['id', 'search_text', 'title', 'web_result_page', 'position', 'display_order', 'is_active']}
              csvFilename="fastmoney_searches"
            />

            <div className="space-y-2">
              {filteredSearches.map((search) => (
                <div key={search.id} className={`flex items-center gap-4 p-4 border rounded bg-[#0d1520] ${selectedSearches.has(search.id) ? 'border-[#00b4d8]' : 'border-[#2a3f5f]'}`}>
                  <Checkbox 
                    checked={selectedSearches.has(search.id)}
                    onCheckedChange={() => toggleSearchSelection(search.id)}
                    className="border-gray-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs border-[#2a3f5f] text-[#00b4d8]">(Related Search)</Badge>
                      <h3 className="font-semibold text-white">{search.title}</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      {search.search_text} • Page {search.web_result_page} • Pos {search.position}
                      {search.blog_id && ` • Blog: ${blogs.find(b => b.id === search.blog_id)?.title || 'Unknown'}`}
                    </p>
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
                        display_order: search.display_order, is_active: search.is_active,
                        blog_id: search.blog_id || ""
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
            {/* AI Web Results Generator */}
            <div className="p-4 border-2 border-[#00b4d8]/30 rounded-lg bg-[#0d1520]">
              <h3 className="text-lg font-semibold text-[#00b4d8] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Web Results Generator
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-gray-300">Select Related Search</Label>
                  <Select
                    value={selectedRelatedSearchForAI}
                    onValueChange={(value) => setSelectedRelatedSearchForAI(value)}
                  >
                    <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white mt-1">
                      <SelectValue placeholder="Choose a related search..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                      {relatedSearches.map((search) => (
                        <SelectItem key={search.id} value={search.id} className="text-white hover:bg-[#2a3f5f]">
                          {search.title} (wr={search.web_result_page})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={generateWebResultsWithAI}
                    disabled={!selectedRelatedSearchForAI || isGeneratingWebResults}
                    className="bg-[#00b4d8] hover:bg-[#0096b4] text-white gap-2"
                  >
                    {isGeneratingWebResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate 6 Web Results
                  </Button>
                </div>
              </div>

              {/* Generated Results */}
              {generatedWebResults.length > 0 && (
                <div className="space-y-3 mt-4 border-t border-[#2a3f5f] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base text-white">Generated Results for wr={generatedWebResults[0]?.targetPage}:</Label>
                    <span className="text-sm text-gray-400">(Select up to 4 to save)</span>
                  </div>
                  {generatedWebResults.map((result, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border space-y-3 ${result.isSponsored ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#1a2942] border-[#2a3f5f]'}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={result.selected}
                          onCheckedChange={(checked) => {
                            const updated = [...generatedWebResults];
                            updated[idx].selected = !!checked;
                            setGeneratedWebResults(updated);
                          }}
                          className="border-gray-500 data-[state=checked]:bg-[#00b4d8]"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-gray-400">Title</Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-400">Sponsored</Label>
                              <Switch
                                checked={result.isSponsored}
                                onCheckedChange={(checked) => {
                                  const updated = [...generatedWebResults];
                                  updated[idx].isSponsored = checked;
                                  setGeneratedWebResults(updated);
                                }}
                              />
                            </div>
                          </div>
                          <Input
                            value={result.title}
                            onChange={(e) => {
                              const updated = [...generatedWebResults];
                              updated[idx].title = e.target.value;
                              setGeneratedWebResults(updated);
                            }}
                            className="bg-[#0d1520] border-[#2a3f5f] text-white"
                          />
                          <div>
                            <Label className="text-xs text-gray-400">Description</Label>
                            <Textarea
                              value={result.description}
                              onChange={(e) => {
                                const updated = [...generatedWebResults];
                                updated[idx].description = e.target.value;
                                setGeneratedWebResults(updated);
                              }}
                              className="mt-1 bg-[#0d1520] border-[#2a3f5f] text-white"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400">Link URL (required)</Label>
                            <Input
                              value={result.link}
                              onChange={(e) => {
                                const updated = [...generatedWebResults];
                                updated[idx].link = e.target.value;
                                setGeneratedWebResults(updated);
                              }}
                              placeholder="https://example.com"
                              className="mt-1 bg-[#0d1520] border-[#2a3f5f] text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button onClick={saveGeneratedWebResults} className="bg-[#00b4d8] hover:bg-[#0096b4] text-white">
                      Save Selected to wr={generatedWebResults[0]?.targetPage}
                    </Button>
                    <Button variant="outline" onClick={() => setGeneratedWebResults([])} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

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
            
            <BulkActionToolbar
              selectedCount={selectedWebResults.size}
              totalCount={filteredWebResults.length}
              onSelectAll={handleSelectAllWebResults}
              onDelete={handleDeleteSelectedWebResults}
              onActivate={handleActivateWebResults}
              onDeactivate={handleDeactivateWebResults}
              isAllSelected={selectedWebResults.size === filteredWebResults.length && filteredWebResults.length > 0}
              isDarkTheme={true}
              selectedData={filteredWebResults.filter(w => selectedWebResults.has(w.id))}
              allData={webResults}
              csvColumns={['id', 'title', 'description', 'original_link', 'web_result_page', 'display_order', 'is_active', 'is_sponsored']}
              csvFilename="fastmoney_web_results"
            />

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
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                          {allWebResults.map(wr => {
                            const hasPrelander = prelanders.some(p => p.web_result_id === wr.id);
                            return (
                              <SelectItem key={wr.id} value={wr.id} className="text-white hover:bg-[#2a3f5f]">
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">(Web Result)</Badge>
                                  {wr.title} (Page {wr.web_result_page})
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

                    {/* Generate with AI Button */}
                    {prelanderForm.web_result_id && (
                      <div className="flex items-center gap-4 p-3 bg-[#0d1520] border border-[#00b4d8]/30 rounded-lg">
                        <Button
                          type="button"
                          onClick={generatePrelandingWithAI}
                          disabled={isGeneratingPrelanding}
                          className="bg-[#00b4d8] hover:bg-[#0096b4] text-white gap-2"
                        >
                          {isGeneratingPrelanding ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate with AI
                            </>
                          )}
                        </Button>
                        <span className="text-sm text-gray-400">
                          Auto-fill all fields based on selected web result
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch checked={prelanderForm.is_enabled} onCheckedChange={(checked) => setPrelanderForm({ ...prelanderForm, is_enabled: checked })} />
                      <Label className="text-gray-300">Enabled</Label>
                    </div>
                    <div><Label className="text-gray-300">Logo URL</Label><Input value={prelanderForm.logo_url} onChange={(e) => setPrelanderForm({ ...prelanderForm, logo_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div>
                      <Label className="text-gray-300">Main Image URL</Label>
                      <Input value={prelanderForm.main_image_url} onChange={(e) => setPrelanderForm({ ...prelanderForm, main_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" />
                      {prelanderForm.main_image_url && (
                        <div className="mt-2">
                          <img 
                            src={prelanderForm.main_image_url} 
                            alt="Preview" 
                            className="max-h-32 rounded-lg object-cover"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                        </div>
                      )}
                    </div>
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

          {/* Blogs Tab */}
          <TabsContent value="blogs" className="space-y-4">
            <FastMoneyBlogs />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
