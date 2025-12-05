import { useEffect, useState } from "react";
import { mingleMoodyClient } from "@/integrations/minglemoody/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  original_link: string;
  logo_url: string | null;
  position: number;
  prelanding_key: string | null;
  worldwide: boolean;
  is_active: boolean;
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

interface LandingContent {
  id: string;
  title: string;
  description: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ClickDetail {
  id: string;
  ip_address: string | null;
  country: string | null;
  device_type: string | null;
  timestamp: string | null;
}

export const MingleMoodyManager = () => {
  // Related Searches State
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [webResultPage, setWebResultPage] = useState(1);
  const [searchPosition, setSearchPosition] = useState(1);
  const [searchDisplayOrder, setSearchDisplayOrder] = useState(0);
  const [searchIsActive, setSearchIsActive] = useState(true);
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);

  // Web Results State
  const [results, setResults] = useState<WebResult[]>([]);
  const [resultTitle, setResultTitle] = useState("");
  const [resultDescription, setResultDescription] = useState("");
  const [originalLink, setOriginalLink] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [resultWebResultPage, setResultWebResultPage] = useState(1);
  const [selectedRelatedSearchId, setSelectedRelatedSearchId] = useState<string>("");
  const [resultPosition, setResultPosition] = useState(0);
  const [prelandingKey, setPrelandingKey] = useState("");
  const [worldwide, setWorldwide] = useState(true);
  const [resultIsActive, setResultIsActive] = useState(true);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  // Prelandings State
  const [prelandings, setPrelandings] = useState<Prelanding[]>([]);
  const [plKey, setPlKey] = useState("");
  const [plLogoUrl, setPlLogoUrl] = useState("");
  const [plMainImage, setPlMainImage] = useState("");
  const [plHeadline, setPlHeadline] = useState("");
  const [plSubtitle, setPlSubtitle] = useState("");
  const [plDescription, setPlDescription] = useState("");
  const [plRedirectDesc, setPlRedirectDesc] = useState("You will be redirected to...");
  const [plIsActive, setPlIsActive] = useState(true);
  const [editingPlId, setEditingPlId] = useState<string | null>(null);

  // Landing Content State
  const [landingContent, setLandingContent] = useState<LandingContent | null>(null);
  const [lcTitle, setLcTitle] = useState("Mingle Moody");
  const [lcDescription, setLcDescription] = useState("Discover the best platforms for connecting, sharing, and engaging with people worldwide.");

  // Breakdown Dialog
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [clickDetails, setClickDetails] = useState<ClickDetail[]>([]);
  const [selectedItemName, setSelectedItemName] = useState("");

  useEffect(() => {
    fetchSearches();
    fetchResults();
    fetchPrelandings();
    fetchLandingContent();
  }, []);

  // Fetch Functions
  const fetchSearches = async () => {
    const { data } = await mingleMoodyClient.from('related_searches').select('*').order('display_order');
    if (data) setSearches(data);
  };

  const fetchResults = async () => {
    const { data } = await mingleMoodyClient.from('web_results').select('*').order('web_result_page').order('position');
    if (data) setResults(data);
  };

  const fetchLandingContent = async () => {
    const { data } = await mingleMoodyClient.from('landing_content').select('*').limit(1).single();
    if (data) {
      setLandingContent(data);
      setLcTitle(data.title);
      setLcDescription(data.description);
    }
  };

  const fetchPrelandings = async () => {
    const { data } = await mingleMoodyClient.from('prelandings').select('*').order('created_at', { ascending: false });
    if (data) setPrelandings(data);
  };

  // Related Search Handlers
  const handleSaveSearch = async () => {
    if (!searchText) {
      toast.error("Search text is required");
      return;
    }

    const payload = {
      search_text: searchText,
      title: searchTitle || searchText,
      web_result_page: webResultPage,
      position: searchPosition,
      display_order: searchDisplayOrder,
      is_active: searchIsActive
    };

    if (editingSearchId) {
      const { error } = await mingleMoodyClient.from('related_searches').update(payload).eq('id', editingSearchId);
      if (error) toast.error("Error updating: " + error.message);
      else toast.success("Search updated!");
    } else {
      const { error } = await mingleMoodyClient.from('related_searches').insert(payload);
      if (error) toast.error("Error creating: " + error.message);
      else toast.success("Search created!");
    }

    resetSearchForm();
    fetchSearches();
  };

  const handleEditSearch = (search: RelatedSearch) => {
    setEditingSearchId(search.id);
    setSearchText(search.search_text);
    setSearchTitle(search.title || "");
    setWebResultPage(search.web_result_page);
    setSearchPosition(search.position);
    setSearchDisplayOrder(search.display_order);
    setSearchIsActive(search.is_active);
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm("Delete this search?")) return;
    const { error } = await mingleMoodyClient.from('related_searches').delete().eq('id', id);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Deleted!");
    fetchSearches();
  };

  const resetSearchForm = () => {
    setEditingSearchId(null);
    setSearchText("");
    setSearchTitle("");
    setWebResultPage(1);
    setSearchPosition(1);
    setSearchDisplayOrder(0);
    setSearchIsActive(true);
  };

  // Web Result Handlers
  const handleSaveResult = async () => {
    if (!resultTitle || !originalLink) {
      toast.error("Title and link are required");
      return;
    }

    const payload = {
      title: resultTitle,
      description: resultDescription || null,
      original_link: originalLink,
      logo_url: logoUrl || null,
      web_result_page: resultWebResultPage,
      related_search_id: selectedRelatedSearchId || null,
      position: resultPosition,
      prelanding_key: prelandingKey || null,
      worldwide,
      is_active: resultIsActive
    };

    if (editingResultId) {
      const { error } = await mingleMoodyClient.from('web_results').update(payload).eq('id', editingResultId);
      if (error) toast.error("Error updating: " + error.message);
      else toast.success("Web result updated!");
    } else {
      const { error } = await mingleMoodyClient.from('web_results').insert(payload);
      if (error) toast.error("Error creating: " + error.message);
      else toast.success("Web result created!");
    }

    resetResultForm();
    fetchResults();
  };

  const handleEditResult = (result: WebResult) => {
    setEditingResultId(result.id);
    setResultTitle(result.title);
    setResultDescription(result.description || "");
    setOriginalLink((result as any).original_link);
    setLogoUrl(result.logo_url || "");
    setResultWebResultPage(result.web_result_page);
    // Find matching related search by page
    const matchingSearch = searches.find(s => s.web_result_page === result.web_result_page);
    setSelectedRelatedSearchId(matchingSearch?.id || "");
    setResultPosition(result.position);
    setPrelandingKey(result.prelanding_key || "");
    setWorldwide(result.worldwide);
    setResultIsActive(result.is_active);
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm("Delete this web result?")) return;
    const { error } = await mingleMoodyClient.from('web_results').delete().eq('id', id);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Deleted!");
    fetchResults();
  };

  const resetResultForm = () => {
    setEditingResultId(null);
    setResultTitle("");
    setResultDescription("");
    setOriginalLink("");
    setLogoUrl("");
    setResultWebResultPage(1);
    setSelectedRelatedSearchId("");
    setResultPosition(0);
    setPrelandingKey("");
    setWorldwide(true);
    setResultIsActive(true);
  };

  // Prelanding Handlers
  const generateKey = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
  };

  const handleSavePrelanding = async () => {
    if (!plHeadline) {
      toast.error("Headline is required");
      return;
    }

    const payload = {
      key: editingPlId ? undefined : generateKey(plHeadline),
      logo_url: plLogoUrl || null,
      main_image_url: plMainImage || null,
      headline: plHeadline,
      subtitle: plSubtitle || null,
      description: plDescription || null,
      redirect_description: plRedirectDesc || null,
      is_active: plIsActive
    };

    if (editingPlId) {
      const { error } = await mingleMoodyClient.from('prelandings').update(payload).eq('id', editingPlId);
      if (error) toast.error("Error updating: " + error.message);
      else toast.success("Prelanding updated!");
    } else {
      const { error } = await mingleMoodyClient.from('prelandings').insert({ ...payload, key: generateKey(plHeadline) });
      if (error) toast.error("Error creating: " + error.message);
      else toast.success("Prelanding created!");
    }

    resetPlForm();
    fetchPrelandings();
  };

  const handleEditPrelanding = (pl: Prelanding) => {
    setEditingPlId(pl.id);
    setPlKey(pl.key);
    setPlLogoUrl(pl.logo_url || "");
    setPlMainImage(pl.main_image_url || "");
    setPlHeadline(pl.headline);
    setPlSubtitle(pl.subtitle || "");
    setPlDescription(pl.description || "");
    setPlRedirectDesc(pl.redirect_description || "");
    setPlIsActive(pl.is_active);
  };

  const handleDeletePrelanding = async (id: string) => {
    if (!confirm("Delete this prelanding?")) return;
    const { error } = await mingleMoodyClient.from('prelandings').delete().eq('id', id);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Deleted!");
    fetchPrelandings();
  };

  const resetPlForm = () => {
    setEditingPlId(null);
    setPlKey("");
    setPlLogoUrl("");
    setPlMainImage("");
    setPlHeadline("");
    setPlSubtitle("");
    setPlDescription("");
    setPlRedirectDesc("You will be redirected to...");
    setPlIsActive(true);
  };

  // Landing Content Handler
  const handleSaveLandingContent = async () => {
    const payload = {
      title: lcTitle,
      description: lcDescription,
      updated_at: new Date().toISOString()
    };

    if (landingContent?.id) {
      const { error } = await mingleMoodyClient.from('landing_content').update(payload).eq('id', landingContent.id);
      if (error) toast.error("Error updating: " + error.message);
      else toast.success("Landing content updated!");
    } else {
      const { error } = await mingleMoodyClient.from('landing_content').insert(payload);
      if (error) toast.error("Error creating: " + error.message);
      else toast.success("Landing content created!");
    }
    fetchLandingContent();
  };

  // View Breakdown
  const handleViewSearchBreakdown = async (search: RelatedSearch) => {
    const { data } = await mingleMoodyClient
      .from('click_tracking')
      .select('*')
      .eq('related_search_id', search.id)
      .order('timestamp', { ascending: false });
    setClickDetails(data || []);
    setSelectedItemName(search.search_text);
    setShowBreakdown(true);
  };

  const handleViewResultBreakdown = async (result: WebResult) => {
    const { data } = await mingleMoodyClient
      .from('click_tracking')
      .select('*')
      .eq('link_id', result.id)
      .order('timestamp', { ascending: false });
    setClickDetails(data || []);
    setSelectedItemName(result.title);
    setShowBreakdown(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="landing" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-cyan-800">
          <TabsTrigger value="landing" className="data-[state=active]:bg-cyan-600">Landing Content</TabsTrigger>
          <TabsTrigger value="searches" className="data-[state=active]:bg-cyan-600">Related Searches</TabsTrigger>
          <TabsTrigger value="webresults" className="data-[state=active]:bg-cyan-600">Web Results</TabsTrigger>
          <TabsTrigger value="prelandings" className="data-[state=active]:bg-cyan-600">Prelandings</TabsTrigger>
        </TabsList>

        {/* Landing Content Tab */}
        <TabsContent value="landing">
          <Card className="bg-zinc-900 border-cyan-800">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">Landing Page Content</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Title *</label>
                  <Input value={lcTitle} onChange={(e) => setLcTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Description *</label>
                  <Textarea value={lcDescription} onChange={(e) => setLcDescription(e.target.value)} rows={4} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
              </div>
              <Button onClick={handleSaveLandingContent} className="bg-cyan-600 hover:bg-cyan-700">
                {landingContent ? "Update" : "Save"} Landing Content
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Searches Tab */}
        <TabsContent value="searches">
          <Card className="bg-zinc-900 border-cyan-800">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">{editingSearchId ? "Edit" : "Add"} Related Search</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Search Text *</label>
                  <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Title</label>
                  <Input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Web Result Page (wr=)</label>
                  <Input type="number" value={webResultPage} onChange={(e) => setWebResultPage(Number(e.target.value))} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Position</label>
                  <Input type="number" value={searchPosition} onChange={(e) => setSearchPosition(Number(e.target.value))} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Display Order</label>
                  <Input type="number" value={searchDisplayOrder} onChange={(e) => setSearchDisplayOrder(Number(e.target.value))} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={searchIsActive} onCheckedChange={setSearchIsActive} />
                  <label className="text-sm text-white">Active</label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSearch} className="bg-cyan-600 hover:bg-cyan-700">{editingSearchId ? "Update" : "Create"}</Button>
                {editingSearchId && <Button variant="outline" onClick={resetSearchForm}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-cyan-800 mt-4">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">Existing Searches</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {searches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{search.title || search.search_text}</p>
                      <p className="text-sm text-zinc-400">Page {search.web_result_page} | Pos: {search.position} | Order: {search.display_order}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={search.is_active ? "bg-cyan-500" : "bg-zinc-600"}>{search.is_active ? "Active" : "Inactive"}</Badge>
                      <Button size="sm" variant="outline" className="border-cyan-600 text-cyan-400" onClick={() => handleViewSearchBreakdown(search)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditSearch(search)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteSearch(search.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Results Tab */}
        <TabsContent value="webresults">
          <Card className="bg-zinc-900 border-cyan-800">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">{editingResultId ? "Edit" : "Add"} Web Result</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Title *</label>
                  <Input value={resultTitle} onChange={(e) => setResultTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Original Link *</label>
                  <Input value={originalLink} onChange={(e) => setOriginalLink(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-white mb-2 block">Description</label>
                  <Textarea value={resultDescription} onChange={(e) => setResultDescription(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Logo URL</label>
                  <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Related Search (determines page)</label>
                  <Select 
                    value={selectedRelatedSearchId || "__none__"} 
                    onValueChange={(val) => {
                      if (val === "__none__") {
                        setSelectedRelatedSearchId("");
                        setResultWebResultPage(1);
                      } else {
                        setSelectedRelatedSearchId(val);
                        const search = searches.find(s => s.id === val);
                        if (search) setResultWebResultPage(search.web_result_page);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select related search" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select related search</SelectItem>
                      {searches.map((search) => (
                        <SelectItem key={search.id} value={search.id}>
                          {search.title || search.search_text} (Page {search.web_result_page})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Prelanding (optional)</label>
                  <Select value={prelandingKey || "__none__"} onValueChange={(val) => setPrelandingKey(val === "__none__" ? "" : val)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="No prelanding (direct link)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No prelanding (direct link)</SelectItem>
                      {prelandings.map((pl) => (
                        <SelectItem key={pl.id} value={pl.key}>{pl.headline}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={worldwide} onCheckedChange={setWorldwide} />
                    <label className="text-sm text-white">Worldwide</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={resultIsActive} onCheckedChange={setResultIsActive} />
                    <label className="text-sm text-white">Active</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveResult} className="bg-cyan-600 hover:bg-cyan-700">{editingResultId ? "Update" : "Create"}</Button>
                {editingResultId && <Button variant="outline" onClick={resetResultForm}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-cyan-800 mt-4">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">Existing Web Results</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {results.map((result) => {
                  const relatedSearch = searches.find(s => s.web_result_page === result.web_result_page);
                  return (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.logo_url ? (
                        <img src={result.logo_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-cyan-500/20 flex items-center justify-center">
                          <span className="text-cyan-400 font-bold">{result.title.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{result.title}</p>
                        <p className="text-sm text-zinc-400">
                          {relatedSearch ? relatedSearch.title || relatedSearch.search_text : `Page ${result.web_result_page}`}
                          {result.prelanding_key && <span className="text-cyan-400"> • Has Prelanding</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={result.is_active ? "bg-cyan-500" : "bg-zinc-600"}>{result.is_active ? "Active" : "Inactive"}</Badge>
                      <Button size="sm" variant="outline" className="border-cyan-600 text-cyan-400" onClick={() => handleViewResultBreakdown(result)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditResult(result)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteResult(result.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prelandings Tab */}
        <TabsContent value="prelandings">
          <Card className="bg-zinc-900 border-cyan-800">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">{editingPlId ? "Edit" : "Add"} Prelanding</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Headline *</label>
                  <Input value={plHeadline} onChange={(e) => setPlHeadline(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Subtitle</label>
                  <Input value={plSubtitle} onChange={(e) => setPlSubtitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-white mb-2 block">Description</label>
                  <Textarea value={plDescription} onChange={(e) => setPlDescription(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Logo URL</label>
                  <Input value={plLogoUrl} onChange={(e) => setPlLogoUrl(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Main Image URL</label>
                  <Input value={plMainImage} onChange={(e) => setPlMainImage(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-white mb-2 block">Redirect Description</label>
                  <Input value={plRedirectDesc} onChange={(e) => setPlRedirectDesc(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={plIsActive} onCheckedChange={setPlIsActive} />
                  <label className="text-sm text-white">Active</label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSavePrelanding} className="bg-cyan-600 hover:bg-cyan-700">{editingPlId ? "Update" : "Create"}</Button>
                {editingPlId && <Button variant="outline" onClick={resetPlForm}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-cyan-800 mt-4">
            <CardHeader className="bg-cyan-500/10 border-b border-cyan-800">
              <CardTitle className="text-cyan-400">Existing Prelandings</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {prelandings.map((pl) => (
                  <div key={pl.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{pl.headline}</p>
                      <p className="text-sm text-zinc-400">Key: {pl.key}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={pl.is_active ? "bg-cyan-500" : "bg-zinc-600"}>{pl.is_active ? "Active" : "Inactive"}</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleEditPrelanding(pl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeletePrelanding(pl.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Click Breakdown Dialog */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-zinc-900 border-cyan-800">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Click Breakdown: {selectedItemName}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 mb-4">
            <p className="text-sm text-zinc-400">Total Clicks: <span className="text-white font-bold">{clickDetails.length}</span></p>
            <p className="text-sm text-zinc-400">Unique IPs: <span className="text-white font-bold">{new Set(clickDetails.map(c => c.ip_address).filter(Boolean)).size}</span></p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">IP Address</TableHead>
                <TableHead className="text-zinc-400">Country</TableHead>
                <TableHead className="text-zinc-400">Device</TableHead>
                <TableHead className="text-zinc-400">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clickDetails.map((click) => (
                <TableRow key={click.id} className="border-zinc-700">
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
    </div>
  );
};

export default MingleMoodyManager;
