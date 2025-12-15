import { useState, useEffect } from "react";
import { offerGrabZoneClient } from "@/integrations/offergrabzone/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";
import OfferGrabZoneBlogs from "./OfferGrabZoneBlogs";

interface GeneratedWebResult {
  name: string;
  title: string;
  description: string;
  link: string;
  isSelected: boolean;
  isSponsored: boolean;
}

interface RelatedSearch {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
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

interface LandingContent {
  id: string;
  site_name: string;
  headline: string;
  description: string;
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

const COUNTRIES = [
  { code: 'worldwide', name: 'Worldwide' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
];

interface OfferGrabZoneManagerProps {
  initialTab?: string;
}

const OfferGrabZoneManager = ({ initialTab = "landing" }: OfferGrabZoneManagerProps) => {
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
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [selectedWebResults, setSelectedWebResults] = useState<Set<string>>(new Set());
  const [searchForm, setSearchForm] = useState({
    title: "", serial_number: 1, target_wr: 1, is_active: true, blog_id: "" as string | null
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
    await offerGrabZoneClient.from("related_searches").delete().in("id", Array.from(selectedSearches));
    toast.success(`Deleted ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleBulkActivateSearches = async () => {
    await offerGrabZoneClient.from("related_searches").update({ is_active: true }).in("id", Array.from(selectedSearches));
    toast.success(`Activated ${selectedSearches.size} search(es)`);
    setSelectedSearches(new Set());
    fetchRelatedSearches();
  };

  const handleBulkDeactivateSearches = async () => {
    await offerGrabZoneClient.from("related_searches").update({ is_active: false }).in("id", Array.from(selectedSearches));
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
    await offerGrabZoneClient.from("web_results").delete().in("id", Array.from(selectedWebResults));
    toast.success(`Deleted ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
    fetchAllWebResults();
  };

  const handleBulkActivateWebResults = async () => {
    await offerGrabZoneClient.from("web_results").update({ is_active: true }).in("id", Array.from(selectedWebResults));
    toast.success(`Activated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  const handleBulkDeactivateWebResults = async () => {
    await offerGrabZoneClient.from("web_results").update({ is_active: false }).in("id", Array.from(selectedWebResults));
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
    name: "", title: "", description: "", link: "", logo_url: "",
    wr_page: 1, serial_number: 0, is_active: true,
    allowed_countries: ["worldwide"] as string[], fallback_link: ""
  });

  // AI Web Results Generator
  const [selectedRelatedSearchForAI, setSelectedRelatedSearchForAI] = useState<string>("");
  const [isGeneratingWebResults, setIsGeneratingWebResults] = useState(false);
  const [generatedWebResults, setGeneratedWebResults] = useState<GeneratedWebResult[]>([]);

  // Prelandings
  const [prelandings, setPrelandings] = useState<Prelanding[]>([]);
  const [prelandingDialog, setPrelandingDialog] = useState(false);
  const [editingPrelanding, setEditingPrelanding] = useState<Prelanding | null>(null);
  const [isGeneratingPrelanding, setIsGeneratingPrelanding] = useState(false);
  const [prelandingForm, setPrelandingForm] = useState({
    web_result_id: "", logo_url: "", main_image_url: "", headline: "",
    description: "", email_placeholder: "Enter your email", cta_button_text: "Get Started",
    background_color: "#1a1a2e", background_image_url: "", is_active: true
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
      fetchPrelandings(),
      fetchBlogs()
    ]);
  };

  const fetchLandingContent = async () => {
    const { data } = await offerGrabZoneClient.from("landing_content").select("*").limit(1).maybeSingle();
    if (data) setLandingContent(data);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await offerGrabZoneClient.from("related_searches").select("*").order("serial_number");
    if (error) toast.error("Failed to fetch related searches");
    else setRelatedSearches(data || []);
  };

  const fetchBlogs = async () => {
    const { data, error } = await offerGrabZoneClient.from("blogs").select("id, title, slug").order("title");
    if (error) console.error("Failed to fetch blogs:", error);
    else setBlogs(data || []);
  };

  const fetchAllWebResults = async () => {
    const { data, error } = await offerGrabZoneClient.from("web_results").select("*").order("serial_number");
    if (error) console.error("Failed to fetch all web results:", error);
    else setAllWebResults(data || []);
  };

  const fetchWebResults = async () => {
    const { data, error } = await offerGrabZoneClient
      .from("web_results")
      .select("*")
      .eq("wr_page", selectedPage)
      .order("serial_number");
    if (error) toast.error("Failed to fetch web results");
    else setWebResults(data || []);
  };

  const fetchPrelandings = async () => {
    const { data } = await offerGrabZoneClient.from("prelandings").select("*").order("created_at", { ascending: false });
    if (data) setPrelandings(data);
  };

  // Position management functions
  const getTakenPositions = () => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.target_wr || webResultForm.wr_page
      : webResultForm.wr_page;
    return allWebResults
      .filter(wr => wr.wr_page === pageNum)
      .filter(wr => editingWebResult ? wr.id !== editingWebResult.id : true)
      .map(wr => wr.serial_number);
  };

  const getResultAtPosition = (position: number) => {
    const pageNum = selectedSearchForResult 
      ? relatedSearches.find(s => s.id === selectedSearchForResult)?.target_wr || webResultForm.wr_page
      : webResultForm.wr_page;
    return allWebResults.find(wr => 
      wr.wr_page === pageNum && 
      wr.serial_number === position &&
      (editingWebResult ? wr.id !== editingWebResult.id : true)
    );
  };

  const takenPositions = getTakenPositions();
  const isPositionTaken = takenPositions.includes(webResultForm.serial_number);
  const existingResultAtPosition = isPositionTaken ? getResultAtPosition(webResultForm.serial_number) : null;

  // Landing Content CRUD
  const handleSaveLanding = async () => {
    if (!landingContent) return;
    const { error } = await offerGrabZoneClient
      .from("landing_content")
      .update({ headline: landingContent.headline, description: landingContent.description })
      .eq("id", landingContent.id);
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
      const { error } = await offerGrabZoneClient.from("related_searches").update(data).eq("id", editingSearch.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchRelatedSearches(); resetSearchForm(); }
    } else {
      const { error } = await offerGrabZoneClient.from("related_searches").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchRelatedSearches(); resetSearchForm(); }
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Delete this search?")) {
      const { error } = await offerGrabZoneClient.from("related_searches").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchRelatedSearches(); }
    }
  };

  const resetSearchForm = () => {
    setSearchForm({ title: "", serial_number: relatedSearches.length + 1, target_wr: 1, is_active: true, blog_id: null });
    setEditingSearch(null);
    setSearchDialog(false);
  };

  // Web Result CRUD
  const handleWebResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let pageNumber = webResultForm.wr_page;
    if (selectedSearchForResult && !editingWebResult) {
      const selectedSearch = relatedSearches.find(s => s.id === selectedSearchForResult);
      if (selectedSearch) pageNumber = selectedSearch.target_wr;
    }

    // Check if position is taken and force replace is not enabled
    if (isPositionTaken && !forceReplace && !editingWebResult) {
      toast.error('Position is already taken. Enable "Force Replace" to override.');
      return;
    }

    // If force replace is enabled and position is taken, delete existing first
    if (forceReplace && isPositionTaken && existingResultAtPosition) {
      const { error: deleteError } = await offerGrabZoneClient
        .from('web_results')
        .delete()
        .eq('id', existingResultAtPosition.id);
      
      if (deleteError) {
        toast.error('Failed to replace existing result');
        return;
      }
    }
    
    const data = { ...webResultForm, wr_page: pageNumber };

    if (editingWebResult) {
      const { error } = await offerGrabZoneClient.from("web_results").update(data).eq("id", editingWebResult.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    } else {
      if (!selectedSearchForResult) {
        toast.error("Please select a related search first");
        return;
      }
      const { error } = await offerGrabZoneClient.from("web_results").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success(forceReplace && isPositionTaken ? "Replaced" : "Created"); fetchWebResults(); fetchAllWebResults(); resetWebResultForm(); }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (confirm("Delete this web result?")) {
      const { error } = await offerGrabZoneClient.from("web_results").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchWebResults(); fetchAllWebResults(); }
    }
  };

  const resetWebResultForm = () => {
    setWebResultForm({
      name: "", title: "", description: "", link: "", logo_url: "",
      wr_page: selectedPage, serial_number: 0, is_active: true,
      allowed_countries: ["worldwide"], fallback_link: ""
    });
    setSelectedSearchForResult("");
    setEditingWebResult(null);
    setForceReplace(false);
    setWebResultDialog(false);
  };

  // AI Web Results Generation
  const generateWebResultsWithAI = async () => {
    if (!selectedRelatedSearchForAI) {
      toast.error("Please select a related search first");
      return;
    }

    const search = relatedSearches.find(s => s.id === selectedRelatedSearchForAI);
    if (!search) return;

    setIsGeneratingWebResults(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-web-results", {
        body: { searchText: search.title, count: 6 },
      });

      if (error) throw error;

      if (data.webResults && data.webResults.length > 0) {
        setGeneratedWebResults(data.webResults.map((r: any) => ({
          name: r.name || r.title?.split(' ')[0] || 'Site',
          title: r.title,
          description: r.description,
          link: r.url || r.link,
          isSelected: false,
          isSponsored: r.is_sponsored || false,
        })));
        toast.success("6 web results generated! Select up to 4.");
      } else {
        throw new Error(data.error || "Failed to generate web results");
      }
    } catch (error) {
      console.error("Error generating web results:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate web results");
    } finally {
      setIsGeneratingWebResults(false);
    }
  };

  const toggleGeneratedResultSelection = (index: number) => {
    setGeneratedWebResults(prev => {
      const selected = prev.filter(r => r.isSelected).length;
      const result = prev[index];
      
      if (!result.isSelected && selected >= 4) {
        toast.error("Maximum 4 web results allowed");
        return prev;
      }
      
      return prev.map((r, i) => 
        i === index ? { ...r, isSelected: !r.isSelected } : r
      );
    });
  };

  const toggleGeneratedResultSponsored = (index: number) => {
    setGeneratedWebResults(prev => 
      prev.map((r, i) => 
        i === index ? { ...r, isSponsored: !r.isSponsored } : r
      )
    );
  };

  const saveGeneratedWebResults = async () => {
    const selectedResults = generatedWebResults.filter(r => r.isSelected);
    if (selectedResults.length === 0) {
      toast.error("Please select at least one web result");
      return;
    }

    const search = relatedSearches.find(s => s.id === selectedRelatedSearchForAI);
    if (!search) return;

    try {
      const resultsToInsert = selectedResults.map((r, idx) => ({
        name: r.name,
        title: r.title,
        description: r.description,
        link: r.link,
        wr_page: search.target_wr,
        is_sponsored: r.isSponsored,
        serial_number: idx + 1,
        is_active: true,
        allowed_countries: ['worldwide'],
      }));

      const { error } = await offerGrabZoneClient.from('web_results').insert(resultsToInsert);
      if (error) throw error;

      setGeneratedWebResults([]);
      setSelectedRelatedSearchForAI("");
      fetchWebResults();
      fetchAllWebResults();
      toast.success(`${selectedResults.length} web results added to wr=${search.target_wr}`);
    } catch (error) {
      console.error('Error saving web results:', error);
      toast.error("Failed to save web results: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Prelanding CRUD
  const handlePrelandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...prelandingForm, web_result_id: prelandingForm.web_result_id || null };

    if (editingPrelanding) {
      const { error } = await offerGrabZoneClient.from("prelandings").update(data).eq("id", editingPrelanding.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Updated"); fetchPrelandings(); resetPrelandingForm(); }
    } else {
      const { error } = await offerGrabZoneClient.from("prelandings").insert([data]);
      if (error) toast.error("Failed to create");
      else { toast.success("Created"); fetchPrelandings(); resetPrelandingForm(); }
    }
  };

  // Generate Prelanding with AI
  const generatePrelandingWithAI = async () => {
    if (!prelandingForm.web_result_id) {
      toast.error("Please select a web result first");
      return;
    }

    const selectedResult = allWebResults.find(r => r.id === prelandingForm.web_result_id);
    if (!selectedResult) {
      toast.error("Web result not found");
      return;
    }

    setIsGeneratingPrelanding(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-offergrabzone-prelanding', {
        body: {
          webResultName: selectedResult.name,
          webResultTitle: selectedResult.title,
          webResultLink: selectedResult.link,
        },
      });

      if (error) throw error;

      if (data) {
        setPrelandingForm({
          ...prelandingForm,
          headline: data.headline || prelandingForm.headline,
          description: data.description || prelandingForm.description,
          email_placeholder: data.email_placeholder || prelandingForm.email_placeholder,
          cta_button_text: data.cta_button_text || prelandingForm.cta_button_text,
          background_color: data.background_color || prelandingForm.background_color,
          main_image_url: data.main_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
        });
        toast.success("Pre-landing content generated with AI!");
      }
    } catch (error) {
      console.error('Error generating prelanding:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content. Please try again.");
    } finally {
      setIsGeneratingPrelanding(false);
    }
  };

  const handleDeletePrelanding = async (id: string) => {
    if (confirm("Delete this prelanding?")) {
      const { error } = await offerGrabZoneClient.from("prelandings").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchPrelandings(); }
    }
  };

  const resetPrelandingForm = () => {
    setPrelandingForm({
      web_result_id: "", logo_url: "", main_image_url: "", headline: "",
      description: "", email_placeholder: "Enter your email", cta_button_text: "Get Started",
      background_color: "#1a1a2e", background_image_url: "", is_active: true
    });
    setEditingPrelanding(null);
    setPrelandingDialog(false);
    setIsGeneratingPrelanding(false);
  };

  const filteredSearches = relatedSearches.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebResults = webResults.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="bg-[#1a2942] border-[#2a3f5f] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-2xl">🎁</span> OfferGrabZone Manager
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
                  <Label className="text-gray-300">Headline</Label>
                  <Input
                    value={landingContent.headline}
                    onChange={(e) => setLandingContent({ ...landingContent, headline: e.target.value })}
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
                    <div>
                      <Label className="text-gray-300">Blog</Label>
                      <Select value={searchForm.blog_id || "none"} onValueChange={(value) => setSearchForm({ ...searchForm, blog_id: value === "none" ? null : value })}>
                        <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                          <SelectValue placeholder="Select blog" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                          <SelectItem value="none" className="text-gray-400 hover:bg-[#2a3f5f]">No Blog</SelectItem>
                          {blogs.map(blog => (
                            <SelectItem key={blog.id} value={blog.id} className="text-white hover:bg-[#2a3f5f]">
                              {blog.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-gray-300">Title *</Label><Input value={searchForm.title} onChange={(e) => setSearchForm({ ...searchForm, title: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Serial Number</Label><Input type="number" value={searchForm.serial_number} onChange={(e) => setSearchForm({ ...searchForm, serial_number: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                      <div><Label className="text-gray-300">Target WR Page</Label><Input type="number" value={searchForm.target_wr} onChange={(e) => setSearchForm({ ...searchForm, target_wr: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    </div>
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
              selectedData={filteredSearches.filter(s => selectedSearches.has(s.id))}
              allData={relatedSearches}
              csvColumns={['id', 'title', 'serial_number', 'target_wr', 'is_active']}
              csvFilename="offergrabzone_searches"
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
                      {search.blog_id ? (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-0">
                          {blogs.find(b => b.id === search.blog_id)?.title || 'Blog'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-400 border-0">No Blog</Badge>
                      )}
                      <h3 className="font-semibold text-white">{search.title}</h3>
                    </div>
                    <p className="text-sm text-gray-400">Serial: {search.serial_number} • Target WR: {search.target_wr}</p>
                    <span className={`text-xs px-2 py-1 rounded ${search.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                      {search.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                      setEditingSearch(search);
                      setSearchForm({
                        title: search.title, serial_number: search.serial_number,
                        target_wr: search.target_wr, is_active: search.is_active,
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
            <div className="p-6 border-2 border-[#00b4d8]/30 rounded-lg bg-[#0d1520]">
              <h3 className="font-semibold text-[#00b4d8] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Web Results Generator
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-400 mb-2 block">Select Related Search</Label>
                  <div className="flex gap-4">
                    <Select 
                      value={selectedRelatedSearchForAI} 
                      onValueChange={(value) => {
                        setSelectedRelatedSearchForAI(value);
                        const search = relatedSearches.find(s => s.id === value);
                        if (search) {
                          setSelectedPage(search.target_wr);
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1 bg-[#0d1520] border-[#2a3f5f] text-white">
                        <SelectValue placeholder="Choose a related search" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                        {relatedSearches.map(search => (
                          <SelectItem key={search.id} value={search.id} className="text-white hover:bg-[#2a3f5f]">
                            {search.title} (wr={search.target_wr})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={generateWebResultsWithAI} 
                      disabled={!selectedRelatedSearchForAI || isGeneratingWebResults}
                      className="gap-2 bg-[#00b4d8] hover:bg-[#0096b4] text-white"
                    >
                      {isGeneratingWebResults ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate 6 Web Results
                    </Button>
                  </div>
                </div>

                {/* Generated Results Selection */}
                {generatedWebResults.length > 0 && (
                  <div className="space-y-3 p-4 border border-[#2a3f5f] rounded-lg bg-[#1a2942]/50">
                    <Label className="text-sm font-medium text-white">
                      Select Web Results (max 4) - Toggle Sponsored
                    </Label>
                    <p className="text-xs text-gray-400">
                      Selected results will be added to wr={relatedSearches.find(s => s.id === selectedRelatedSearchForAI)?.target_wr}
                    </p>
                    
                    <div className="flex flex-col gap-3">
                      {generatedWebResults.map((result, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border transition-colors ${
                            result.isSelected 
                              ? 'border-[#00b4d8] bg-[#00b4d8]/10' 
                              : 'border-[#2a3f5f] hover:border-[#00b4d8]/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={result.isSelected}
                              onCheckedChange={() => toggleGeneratedResultSelection(index)}
                              className="mt-1 border-gray-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white">{result.name}</span>
                                {result.isSponsored && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                                    Sponsored
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#00b4d8] mb-1">{result.title}</p>
                              <p className="text-xs text-gray-400 mb-2">{result.description}</p>
                              <p className="text-xs text-gray-500 truncate">{result.link}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-400">Sponsored</Label>
                              <Switch
                                checked={result.isSponsored}
                                onCheckedChange={() => toggleGeneratedResultSponsored(index)}
                                disabled={!result.isSelected}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-gray-400">
                        {generatedWebResults.filter(r => r.isSelected).length}/4 selected
                      </p>
                      <Button 
                        onClick={saveGeneratedWebResults} 
                        disabled={!generatedWebResults.some(r => r.isSelected)}
                        className="bg-[#00b4d8] hover:bg-[#0096b4] text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Save Selected Results
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
                                {s.title} → WR Page {s.target_wr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedSearchForResult && (
                          <p className="text-xs text-gray-400 mt-1">
                            Web result will be added to Page {relatedSearches.find(s => s.id === selectedSearchForResult)?.target_wr || 1}
                          </p>
                        )}
                      </div>
                    )}
                    <div><Label className="text-gray-300">Name *</Label><Input value={webResultForm.name} onChange={(e) => setWebResultForm({ ...webResultForm, name: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Title *</Label><Input value={webResultForm.title} onChange={(e) => setWebResultForm({ ...webResultForm, title: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Description</Label><Textarea value={webResultForm.description} onChange={(e) => setWebResultForm({ ...webResultForm, description: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" /></div>
                    <div><Label className="text-gray-300">Logo URL</Label><Input value={webResultForm.logo_url} onChange={(e) => setWebResultForm({ ...webResultForm, logo_url: e.target.value })} placeholder="https://..." className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500" /></div>
                    <div><Label className="text-gray-300">Link *</Label><Input value={webResultForm.link} onChange={(e) => setWebResultForm({ ...webResultForm, link: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Fallback Link</Label><Input value={webResultForm.fallback_link} onChange={(e) => setWebResultForm({ ...webResultForm, fallback_link: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Page {!editingWebResult && "(Auto)"}</Label>
                        {editingWebResult ? (
                          <Input type="number" value={webResultForm.wr_page} onChange={(e) => setWebResultForm({ ...webResultForm, wr_page: parseInt(e.target.value) })} className="bg-[#0d1520] border-[#2a3f5f] text-white" />
                        ) : (
                          <div className="p-2 rounded border bg-[#0d1520] border-[#2a3f5f] text-gray-400">
                            {selectedSearchForResult ? `Page ${relatedSearches.find(s => s.id === selectedSearchForResult)?.target_wr || 1}` : "Select search first"}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-300">Serial Number (Position)</Label>
                        <Input type="number" value={webResultForm.serial_number} onChange={(e) => setWebResultForm({ ...webResultForm, serial_number: parseInt(e.target.value) || 0 })} className={`bg-[#0d1520] border-[#2a3f5f] text-white ${isPositionTaken ? 'border-yellow-500' : ''}`} />
                        <p className="text-xs text-gray-400 mt-1">This result will appear at position #{webResultForm.serial_number}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-gray-400 mr-2">Positions:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setWebResultForm({ ...webResultForm, serial_number: pos })}
                              className={`w-6 h-6 text-xs rounded ${
                                takenPositions.includes(pos)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-green-500 text-white'
                              } ${webResultForm.serial_number === pos ? 'ring-2 ring-[#00b4d8]' : ''}`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                        {isPositionTaken && existingResultAtPosition && !editingWebResult && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Position {webResultForm.serial_number} is taken by: "{existingResultAtPosition.title}"</span>
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
                      <Select value={webResultForm.allowed_countries[0]} onValueChange={(v) => setWebResultForm({ ...webResultForm, allowed_countries: [v] })}>
                        <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                          {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code} className="text-white hover:bg-[#2a3f5f]">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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
              selectedData={filteredWebResults.filter(w => selectedWebResults.has(w.id))}
              allData={webResults}
              csvColumns={['id', 'name', 'title', 'description', 'link', 'wr_page', 'serial_number', 'is_active', 'is_sponsored']}
              csvFilename="offergrabzone_web_results"
            />
            <div className="space-y-2">
              {filteredWebResults.map((result) => {
                const hasPrelander = prelandings.some(p => p.web_result_id === result.id);
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
                        <p className="text-xs text-gray-500">Serial: {result.serial_number} • {result.allowed_countries?.join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${result.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                        {result.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                        setEditingWebResult(result);
                        setWebResultForm({
                          name: result.name, title: result.title, description: result.description || "",
                          logo_url: result.logo_url || "", link: result.link,
                          wr_page: result.wr_page, serial_number: result.serial_number,
                          is_active: result.is_active, allowed_countries: result.allowed_countries || ["worldwide"],
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
                    <div>
                      <Label className="text-gray-300">Web Result</Label>
                      <div className="flex gap-2">
                        <Select value={prelandingForm.web_result_id} onValueChange={(v) => setPrelandingForm({ ...prelandingForm, web_result_id: v })}>
                          <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white flex-1"><SelectValue placeholder="Select web result" /></SelectTrigger>
                          <SelectContent className="bg-[#1a2942] border-[#2a3f5f] max-h-[200px]">
                            {allWebResults.map(wr => {
                              const hasPrelander = prelandings.some(p => p.web_result_id === wr.id);
                              return (
                                <SelectItem key={wr.id} value={wr.id} className="text-white hover:bg-[#2a3f5f]">
                                  <span className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">(WR)</Badge>
                                    {wr.title}
                                    {hasPrelander && <Badge className="text-xs bg-green-600">Has Pre-landing</Badge>}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button"
                          onClick={generatePrelandingWithAI}
                          disabled={isGeneratingPrelanding || !prelandingForm.web_result_id}
                          className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                        >
                          {isGeneratingPrelanding ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>
                          )}
                        </Button>
                      </div>
                      {prelandingForm.web_result_id && (
                        <p className="text-xs text-gray-400 mt-1">
                          Redirect URL: {allWebResults.find(r => r.id === prelandingForm.web_result_id)?.link || 'N/A'}
                        </p>
                      )}
                    </div>
                    <div><Label className="text-gray-300">Headline *</Label><Input value={prelandingForm.headline} onChange={(e) => setPrelandingForm({ ...prelandingForm, headline: e.target.value })} required className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div><Label className="text-gray-300">Description</Label><Textarea value={prelandingForm.description} onChange={(e) => setPrelandingForm({ ...prelandingForm, description: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Logo URL</Label><Input value={prelandingForm.logo_url} onChange={(e) => setPrelandingForm({ ...prelandingForm, logo_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                      <div>
                        <Label className="text-gray-300">Main Image URL</Label>
                        <Input value={prelandingForm.main_image_url} onChange={(e) => setPrelandingForm({ ...prelandingForm, main_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" />
                      </div>
                    </div>
                    {prelandingForm.main_image_url && (
                      <div className="border border-[#2a3f5f] rounded p-2">
                        <Label className="text-gray-300 text-xs">Image Preview</Label>
                        <img 
                          src={prelandingForm.main_image_url} 
                          alt="Preview" 
                          className="mt-1 max-h-32 w-full object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Email Placeholder</Label><Input value={prelandingForm.email_placeholder} onChange={(e) => setPrelandingForm({ ...prelandingForm, email_placeholder: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                      <div><Label className="text-gray-300">CTA Button Text</Label><Input value={prelandingForm.cta_button_text} onChange={(e) => setPrelandingForm({ ...prelandingForm, cta_button_text: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-gray-300">Background Color</Label><Input type="color" value={prelandingForm.background_color} onChange={(e) => setPrelandingForm({ ...prelandingForm, background_color: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] h-10" /></div>
                      <div><Label className="text-gray-300">Background Image URL</Label><Input value={prelandingForm.background_image_url} onChange={(e) => setPrelandingForm({ ...prelandingForm, background_image_url: e.target.value })} className="bg-[#0d1520] border-[#2a3f5f] text-white" /></div>
                    </div>
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
              {prelandings.map((p) => {
                const wr = webResults.find(w => w.id === p.web_result_id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 border border-[#2a3f5f] rounded bg-[#0d1520]">
                    <div>
                      <h3 className="font-semibold text-white">{p.headline}</h3>
                      <p className="text-sm text-gray-400">Web Result: {wr?.title || 'Not linked'}</p>
                      <span className={`text-xs px-2 py-1 rounded ${p.is_active ? 'bg-[#00b4d8]/20 text-[#00b4d8]' : 'bg-red-500/20 text-red-400'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" onClick={() => {
                        setEditingPrelanding(p);
                        setPrelandingForm({
                          web_result_id: p.web_result_id || "", logo_url: p.logo_url || "",
                          main_image_url: p.main_image_url || "", headline: p.headline,
                          description: p.description || "", email_placeholder: p.email_placeholder,
                          cta_button_text: p.cta_button_text, background_color: p.background_color,
                          background_image_url: p.background_image_url || "", is_active: p.is_active
                        });
                        setPrelandingDialog(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeletePrelanding(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              {prelandings.length === 0 && <p className="text-gray-400 text-center py-8">No prelandings found.</p>}
            </div>
          </TabsContent>

          {/* Blogs Tab */}
          <TabsContent value="blogs" className="space-y-4">
            <OfferGrabZoneBlogs />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export { OfferGrabZoneManager };
