import { useState, useEffect } from "react";
import { dataOrbitZoneClient } from "@/integrations/dataorbitzone/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Sparkles, Loader2, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";

interface Category {
  id: number;
  name: string;
  slug: string;
  code_range?: string;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  category_id?: number;
  author: string;
  content: string;
  featured_image?: string;
  status: string;
  author_bio?: string;
  author_image?: string;
}

interface RelatedSearch {
  id: string;
  blog_id?: string;
  search_text: string;
  display_order: number;
}

interface WebResult {
  id: string;
  related_search_id?: string;
  title: string;
  description?: string;
  logo_url?: string;
  target_url: string;
  page_number: number;
  position: number;
  is_active: boolean;
  is_sponsored: boolean;
}

export const DataOrbitZoneManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [activeTab, setActiveTab] = useState("categories");

  // Bulk selection states
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [selectedWebResults, setSelectedWebResults] = useState<Set<string>>(new Set());

  // Category Form
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", code_range: "" });

  // Blog Form
  const [blogDialog, setBlogDialog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: "", slug: "", category_id: "", author: "", content: "",
    featured_image: "", status: "published", author_bio: "", author_image: ""
  });

  // AI Generation states
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatedRelatedSearches, setGeneratedRelatedSearches] = useState<string[]>([]);
  const [selectedGeneratedSearches, setSelectedGeneratedSearches] = useState<number[]>([]);

  // Related Search Form
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [searchForm, setSearchForm] = useState({
    blog_id: "", search_text: "", display_order: 0
  });

  // Web Result Form
  const [webResultDialog, setWebResultDialog] = useState(false);
  const [editingWebResult, setEditingWebResult] = useState<WebResult | null>(null);
  const [webResultForm, setWebResultForm] = useState({
    related_search_id: "", title: "", description: "", logo_url: "",
    target_url: "", page_number: 1, position: 1, is_active: true, is_sponsored: false
  });

  const getBaseUrl = () => window.location.origin;

  // Copy link functions
  const copyBlogLink = (blog: Blog) => {
    const category = categories.find(c => c.id === blog.category_id);
    const link = `${getBaseUrl()}/dataorbit/blog/${category?.slug || 'general'}/${blog.slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Blog link copied!");
  };

  const copySearchLink = (search: RelatedSearch) => {
    const link = `${getBaseUrl()}/dataorbit/wr?id=${search.id}&wr=${search.display_order}`;
    navigator.clipboard.writeText(link);
    toast.success("Related search link copied!");
  };

  const copyWebResultLink = (result: WebResult) => {
    const search = relatedSearches.find(s => s.id === result.related_search_id);
    const link = `${getBaseUrl()}/dataorbit/wr?id=${search?.id}&wr=${search?.display_order || 1}`;
    navigator.clipboard.writeText(link);
    toast.success("Web result page link copied!");
  };

  const copySelectedBlogLinks = () => {
    const links = blogs
      .filter(b => selectedBlogs.has(b.id))
      .map(blog => {
        const category = categories.find(c => c.id === blog.category_id);
        return `${getBaseUrl()}/dataorbit/blog/${category?.slug || 'general'}/${blog.slug}`;
      })
      .join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`${selectedBlogs.size} blog link(s) copied!`);
  };

  const copySelectedSearchLinks = () => {
    const links = relatedSearches
      .filter(s => selectedSearches.has(s.id))
      .map(search => `${getBaseUrl()}/dataorbit/wr?id=${search.id}&wr=${search.display_order}`)
      .join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`${selectedSearches.size} search link(s) copied!`);
  };

  const copySelectedWebResultLinks = () => {
    const links = webResults
      .filter(r => selectedWebResults.has(r.id))
      .map(result => {
        const search = relatedSearches.find(s => s.id === result.related_search_id);
        return `${getBaseUrl()}/dataorbit/wr?id=${search?.id}&wr=${search?.display_order || 1}`;
      })
      .join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`${selectedWebResults.size} web result link(s) copied!`);
  };

  // Bulk action handlers for Blogs
  const toggleBlogSelection = (id: string) => {
    const newSelected = new Set(selectedBlogs);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedBlogs(newSelected);
  };

  const handleSelectAllBlogs = () => {
    if (selectedBlogs.size === blogs.length) setSelectedBlogs(new Set());
    else setSelectedBlogs(new Set(blogs.map(b => b.id)));
  };

  const handleBulkDeleteBlogs = async () => {
    if (!confirm(`Delete ${selectedBlogs.size} blog(s)?`)) return;
    for (const id of selectedBlogs) {
      await dataOrbitZoneClient.from("dz_blogs").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  const handleBulkActivateBlogs = async () => {
    await dataOrbitZoneClient.from("dz_blogs").update({ status: "published" }).in("id", Array.from(selectedBlogs));
    toast.success(`Activated ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  const handleBulkDeactivateBlogs = async () => {
    await dataOrbitZoneClient.from("dz_blogs").update({ status: "draft" }).in("id", Array.from(selectedBlogs));
    toast.success(`Deactivated ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  // Bulk action handlers for Related Searches
  const toggleSearchSelection = (id: string) => {
    const newSelected = new Set(selectedSearches);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedSearches(newSelected);
  };

  const handleSelectAllSearches = () => {
    if (selectedSearches.size === relatedSearches.length) setSelectedSearches(new Set());
    else setSelectedSearches(new Set(relatedSearches.map(s => s.id)));
  };

  const handleBulkDeleteSearches = async () => {
    if (!confirm(`Delete ${selectedSearches.size} search(es)?`)) return;
    await dataOrbitZoneClient.from("dz_related_searches").delete().in("id", Array.from(selectedSearches));
    toast.success(`Deleted ${selectedSearches.size} search(es)`);
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
    if (selectedWebResults.size === webResults.length) setSelectedWebResults(new Set());
    else setSelectedWebResults(new Set(webResults.map(w => w.id)));
  };

  const handleBulkDeleteWebResults = async () => {
    if (!confirm(`Delete ${selectedWebResults.size} web result(s)?`)) return;
    await dataOrbitZoneClient.from("dz_web_results").delete().in("id", Array.from(selectedWebResults));
    toast.success(`Deleted ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  const handleBulkActivateWebResults = async () => {
    await dataOrbitZoneClient.from("dz_web_results").update({ is_active: true }).in("id", Array.from(selectedWebResults));
    toast.success(`Activated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  const handleBulkDeactivateWebResults = async () => {
    await dataOrbitZoneClient.from("dz_web_results").update({ is_active: false }).in("id", Array.from(selectedWebResults));
    toast.success(`Deactivated ${selectedWebResults.size} web result(s)`);
    setSelectedWebResults(new Set());
    fetchWebResults();
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchCategories(),
      fetchBlogs(),
      fetchRelatedSearches(),
      fetchWebResults()
    ]);
  };

  const fetchCategories = async () => {
    const { data, error } = await dataOrbitZoneClient.from("dz_categories").select("*").order("id");
    if (error) toast.error("Failed to fetch categories: " + error.message);
    else setCategories((data as any) || []);
  };

  const fetchBlogs = async () => {
    const { data, error } = await dataOrbitZoneClient.from("dz_blogs").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch blogs: " + error.message);
    else setBlogs((data as any) || []);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await dataOrbitZoneClient
      .from("dz_related_searches")
      .select("*")
      .order("display_order");
    if (error) {
      console.error('Error fetching related searches:', error);
      toast.error("Failed to fetch related searches");
    } else {
      setRelatedSearches((data as any) || []);
    }
  };

  const fetchWebResults = async () => {
    const { data, error } = await dataOrbitZoneClient.from("dz_web_results").select("*").order("page_number", { ascending: true });
    if (error) toast.error("Failed to fetch web results: " + error.message);
    else setWebResults((data as any) || []);
  };

  // AI Content Generation
  const generateContent = async () => {
    if (!blogForm.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: { title: blogForm.title, slug: blogForm.slug, generateSearches: true }
      });

      if (error) throw error;
      
      if (data.content) {
        setBlogForm(prev => ({ ...prev, content: data.content }));
        if (data.relatedSearches && data.relatedSearches.length > 0) {
          setGeneratedRelatedSearches(data.relatedSearches);
          // Auto-select first 4
          setSelectedGeneratedSearches([0, 1, 2, 3].filter(i => i < data.relatedSearches.length));
        }
        toast.success("Content and related searches generated!");
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || "Failed to generate content");
    } finally {
      setGeneratingContent(false);
    }
  };

  const toggleGeneratedSearch = (index: number) => {
    if (selectedGeneratedSearches.includes(index)) {
      setSelectedGeneratedSearches(prev => prev.filter(i => i !== index));
    } else if (selectedGeneratedSearches.length < 4) {
      setSelectedGeneratedSearches(prev => [...prev, index]);
    } else {
      toast.error("You can select maximum 4 related searches");
    }
  };

  // Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...categoryForm };
    
    if (editingCategory) {
      const { error } = await dataOrbitZoneClient.from("dz_categories").update(data).eq("id", editingCategory.id);
      if (error) toast.error("Failed to update category");
      else { toast.success("Category updated"); fetchCategories(); resetCategoryForm(); }
    } else {
      const { error } = await dataOrbitZoneClient.from("dz_categories").insert([data]);
      if (error) toast.error("Failed to create category");
      else { toast.success("Category created"); fetchCategories(); resetCategoryForm(); }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Delete this category?")) {
      const { error } = await dataOrbitZoneClient.from("dz_categories").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchCategories(); }
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", slug: "", code_range: "" });
    setEditingCategory(null);
    setCategoryDialog(false);
  };

  // Blog CRUD
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...blogForm, category_id: blogForm.category_id ? parseInt(blogForm.category_id) : null };
    
    if (editingBlog) {
      const { error } = await dataOrbitZoneClient.from("dz_blogs").update(data).eq("id", editingBlog.id);
      if (error) toast.error("Failed to update blog");
      else { toast.success("Blog updated"); fetchBlogs(); resetBlogForm(); }
    } else {
      const { data: newBlog, error } = await dataOrbitZoneClient.from("dz_blogs").insert([data]).select().single();
      
      if (error) {
        toast.error("Failed to create blog");
      } else if (newBlog) {
        // Create selected related searches with display_order = 1, 2, 3, 4 for wr=1, wr=2, etc.
        if (selectedGeneratedSearches.length > 0) {
          const searchesToCreate = selectedGeneratedSearches.map((idx, position) => ({
            search_text: generatedRelatedSearches[idx],
            blog_id: newBlog.id,
            display_order: position + 1, // wr=1, wr=2, wr=3, wr=4
            target_url: '/web-results',
            is_active: true
          }));
          
          const { error: searchError } = await dataOrbitZoneClient
            .from("dz_related_searches")
            .insert(searchesToCreate);
          
          if (searchError) {
            console.error('Error creating related searches:', searchError);
          }
        }
        
        toast.success("Blog created with related searches!");
        fetchBlogs();
        fetchRelatedSearches();
        resetBlogForm();
      }
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm("Delete this blog?")) {
      // Also delete related searches for this blog
      await dataOrbitZoneClient.from("dz_related_searches").delete().eq("blog_id", id);
      const { error } = await dataOrbitZoneClient.from("dz_blogs").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchBlogs(); fetchRelatedSearches(); }
    }
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: "", slug: "", category_id: "", author: "", content: "",
      featured_image: "", status: "published", author_bio: "", author_image: ""
    });
    setEditingBlog(null);
    setBlogDialog(false);
    setGeneratedRelatedSearches([]);
    setSelectedGeneratedSearches([]);
  };

  // Related Search CRUD
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchForm.blog_id) {
      toast.error('Please select a blog');
      return;
    }

    if (!searchForm.search_text) {
      toast.error('Please enter search text');
      return;
    }
    
    const data = {
      blog_id: searchForm.blog_id || null,
      search_text: searchForm.search_text,
      target_url: '/web-results',
      display_order: searchForm.display_order,
      is_active: true,
    };
    
    if (editingSearch) {
      const { error } = await dataOrbitZoneClient.from("dz_related_searches").update(data).eq("id", editingSearch.id);
      if (error) {
        console.error('Update error:', error);
        toast.error("Failed to update search: " + error.message);
      } else {
        toast.success("Search updated");
        fetchRelatedSearches();
        resetSearchForm();
      }
    } else {
      const { error } = await dataOrbitZoneClient.from("dz_related_searches").insert([data]);
      if (error) {
        console.error('Insert error:', error);
        toast.error("Failed to create search: " + error.message);
      } else {
        toast.success("Search created");
        fetchRelatedSearches();
        resetSearchForm();
      }
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Delete this search?")) {
      const { error } = await dataOrbitZoneClient.from("dz_related_searches").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchRelatedSearches(); }
    }
  };

  const resetSearchForm = () => {
    setSearchForm({ blog_id: "", search_text: "", display_order: 0 });
    setEditingSearch(null);
    setSearchDialog(false);
  };

  // Web Result CRUD
  const handleWebResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webResultForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!webResultForm.target_url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    
    const data = {
      title: webResultForm.title,
      description: webResultForm.description || null,
      logo_url: webResultForm.logo_url || null,
      target_url: webResultForm.target_url,
      related_search_id: webResultForm.related_search_id || null,
      page_number: Math.max(1, parseInt(webResultForm.page_number.toString()) || 1),
      position: Math.max(1, parseInt(webResultForm.position.toString()) || 1),
      is_active: webResultForm.is_active,
      is_sponsored: webResultForm.is_sponsored,
    };
    
    if (editingWebResult) {
      const { error } = await dataOrbitZoneClient.from("dz_web_results").update(data).eq("id", editingWebResult.id);
      if (error) {
        console.error('Update error:', error);
        toast.error("Failed to update web result: " + error.message);
      } else { 
        toast.success("Web result updated"); 
        fetchWebResults(); 
        resetWebResultForm(); 
      }
    } else {
      const { error } = await dataOrbitZoneClient.from("dz_web_results").insert([data]);
      if (error) {
        console.error('Insert error:', error);
        toast.error("Failed to add web result: " + error.message);
      } else { 
        toast.success("Web result created"); 
        fetchWebResults(); 
        resetWebResultForm(); 
      }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (confirm("Delete this web result?")) {
      const { error } = await dataOrbitZoneClient.from("dz_web_results").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchWebResults(); }
    }
  };

  const resetWebResultForm = () => {
    setWebResultForm({
      related_search_id: "", title: "", description: "", logo_url: "",
      target_url: "", page_number: 1, position: 1, is_active: true, is_sponsored: false
    });
    setEditingWebResult(null);
    setWebResultDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>DataOrbitZone Manager</CardTitle>
        <CardDescription>Manage categories, blogs, related searches, and web results</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="blogs">Blogs ({blogs.length})</TabsTrigger>
            <TabsTrigger value="searches">Searches ({relatedSearches.length})</TabsTrigger>
            <TabsTrigger value="webresults">Web Results ({webResults.length})</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetCategoryForm}><Plus className="mr-2 h-4 w-4" />New Category</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingCategory ? "Edit" : "Create"} Category</DialogTitle></DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div><Label>Name *</Label><Input value={categoryForm.name} onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} required /></div>
                    <div><Label>Slug *</Label><Input value={categoryForm.slug} onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value})} required /></div>
                    <div><Label>Code Range</Label><Input value={categoryForm.code_range} onChange={(e) => setCategoryForm({...categoryForm, code_range: e.target.value})} /></div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingCategory ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetCategoryForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h3 className="font-semibold">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{cat.slug} {cat.code_range && `• ${cat.code_range}`}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingCategory(cat); setCategoryForm({name: cat.name, slug: cat.slug, code_range: cat.code_range || ""}); setCategoryDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Blogs Tab */}
          <TabsContent value="blogs" className="space-y-4">
            <div className="flex justify-end gap-2">
              {selectedBlogs.size > 0 && (
                <Button variant="outline" onClick={copySelectedBlogLinks}>
                  <Copy className="mr-2 h-4 w-4" />Copy {selectedBlogs.size} Link(s)
                </Button>
              )}
              <Dialog open={blogDialog} onOpenChange={setBlogDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetBlogForm}><Plus className="mr-2 h-4 w-4" />New Blog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingBlog ? "Edit" : "Create"} Blog</DialogTitle></DialogHeader>
                  <form onSubmit={handleBlogSubmit} className="space-y-4">
                    <div><Label>Title *</Label><Input value={blogForm.title} onChange={(e) => setBlogForm({...blogForm, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")})} required /></div>
                    <div><Label>Slug *</Label><Input value={blogForm.slug} onChange={(e) => setBlogForm({...blogForm, slug: e.target.value})} required /></div>
                    <div><Label>Category</Label>
                      <Select value={blogForm.category_id} onValueChange={(value) => setBlogForm({...blogForm, category_id: value})}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{categories.map((cat) => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Author *</Label><Input value={blogForm.author} onChange={(e) => setBlogForm({...blogForm, author: e.target.value})} required /></div>
                    <div><Label>Featured Image URL</Label><Input value={blogForm.featured_image} onChange={(e) => setBlogForm({...blogForm, featured_image: e.target.value})} /></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Content * (100 words)</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={generateContent}
                          disabled={generatingContent || !blogForm.title.trim()}
                        >
                          {generatingContent ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1" />
                          )}
                          Generate AI Content
                        </Button>
                      </div>
                      <Textarea value={blogForm.content} onChange={(e) => setBlogForm({...blogForm, content: e.target.value})} rows={6} required placeholder="Enter content or generate with AI..." />
                    </div>

                    {/* Generated Related Searches Selection */}
                    {generatedRelatedSearches.length > 0 && (
                      <div className="border border-border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-semibold">Select Related Searches (max 4)</Label>
                          <span className="text-sm text-muted-foreground">{selectedGeneratedSearches.length}/4 selected</span>
                        </div>
                        <div className="space-y-2">
                          {generatedRelatedSearches.map((search, index) => (
                            <div
                              key={index}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedGeneratedSearches.includes(index) 
                                  ? 'bg-primary/10 border-primary' 
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleGeneratedSearch(index)}
                            >
                              <Checkbox 
                                checked={selectedGeneratedSearches.includes(index)}
                                onCheckedChange={() => toggleGeneratedSearch(index)}
                              />
                              <span className="flex-1">{search}</span>
                              {selectedGeneratedSearches.includes(index) && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  WR={selectedGeneratedSearches.indexOf(index) + 1}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div><Label>Status</Label>
                      <Select value={blogForm.status} onValueChange={(value) => setBlogForm({...blogForm, status: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingBlog ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetBlogForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <BulkActionToolbar
              selectedCount={selectedBlogs.size}
              totalCount={blogs.length}
              onSelectAll={handleSelectAllBlogs}
              onDelete={handleBulkDeleteBlogs}
              onActivate={handleBulkActivateBlogs}
              onDeactivate={handleBulkDeactivateBlogs}
              isAllSelected={selectedBlogs.size === blogs.length && blogs.length > 0}
              selectedData={blogs.filter(b => selectedBlogs.has(b.id))}
              allData={blogs}
              csvColumns={['id', 'title', 'slug', 'author', 'status', 'category_id']}
              csvFilename="dataorbitzone_blogs"
              linkGenerator={(blog) => {
                const category = categories.find(c => c.id === (blog as Blog).category_id);
                return `${getBaseUrl()}/dataorbit/blog/${category?.slug || 'general'}/${(blog as Blog).slug}`;
              }}
            />
            <div className="space-y-2">
              {blogs.map((blog) => (
                <div key={blog.id} className="flex items-center gap-3 p-4 border rounded">
                  <Checkbox
                    checked={selectedBlogs.has(blog.id)}
                    onCheckedChange={() => toggleBlogSelection(blog.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{blog.title}</h3>
                    <p className="text-sm text-muted-foreground">{blog.slug} • {blog.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyBlogLink(blog)} title="Copy Link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/dataorbit/blog/${categories.find(c => c.id === blog.category_id)?.slug || 'general'}/${blog.slug}`, '_blank')} title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingBlog(blog); setBlogForm({title: blog.title, slug: blog.slug, category_id: blog.category_id?.toString() || "", author: blog.author, content: blog.content, featured_image: blog.featured_image || "", status: blog.status, author_bio: blog.author_bio || "", author_image: blog.author_image || ""}); setBlogDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteBlog(blog.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Related Searches Tab */}
          <TabsContent value="searches" className="space-y-4">
            <div className="flex justify-end gap-2">
              {selectedSearches.size > 0 && (
                <Button variant="outline" onClick={copySelectedSearchLinks}>
                  <Copy className="mr-2 h-4 w-4" />Copy {selectedSearches.size} Link(s)
                </Button>
              )}
              <Dialog open={searchDialog} onOpenChange={setSearchDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetSearchForm}><Plus className="mr-2 h-4 w-4" />New Search</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingSearch ? "Edit" : "Create"} Related Search</DialogTitle></DialogHeader>
                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div><Label>Blog *</Label>
                      <Select value={searchForm.blog_id} onValueChange={(value) => setSearchForm({...searchForm, blog_id: value})} required>
                        <SelectTrigger><SelectValue placeholder="Select blog" /></SelectTrigger>
                        <SelectContent>{blogs.map((blog) => <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Search Text *</Label><Input value={searchForm.search_text} onChange={(e) => setSearchForm({...searchForm, search_text: e.target.value})} required /></div>
                    <div><Label>Display Order (WR number)</Label><Input type="number" value={searchForm.display_order} onChange={(e) => setSearchForm({...searchForm, display_order: parseInt(e.target.value) || 1})} min="1" max="4" /></div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingSearch ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetSearchForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <BulkActionToolbar
              selectedCount={selectedSearches.size}
              totalCount={relatedSearches.length}
              onSelectAll={handleSelectAllSearches}
              onDelete={handleBulkDeleteSearches}
              isAllSelected={selectedSearches.size === relatedSearches.length && relatedSearches.length > 0}
              selectedData={relatedSearches.filter(s => selectedSearches.has(s.id))}
              allData={relatedSearches}
              csvColumns={['id', 'search_text', 'display_order', 'blog_id']}
              csvFilename="dataorbitzone_searches"
              linkGenerator={(search) => `${getBaseUrl()}/dataorbit/wr?id=${(search as RelatedSearch).id}&wr=${(search as RelatedSearch).display_order}`}
            />
            <div className="space-y-2">
              {relatedSearches.map((search) => (
                <div key={search.id} className="flex items-center gap-3 p-4 border rounded">
                  <Checkbox
                    checked={selectedSearches.has(search.id)}
                    onCheckedChange={() => toggleSearchSelection(search.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{search.search_text}</h3>
                    <p className="text-sm text-muted-foreground">
                      WR={search.display_order} • Blog: {blogs.find(b => b.id === search.blog_id)?.title || 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copySearchLink(search)} title="Copy Link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/dataorbit/wr?id=${search.id}&wr=${search.display_order}`, '_blank')} title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingSearch(search); setSearchForm({blog_id: search.blog_id || "", search_text: search.search_text, display_order: search.display_order}); setSearchDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSearch(search.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Web Results Tab */}
          <TabsContent value="webresults" className="space-y-4">
            <div className="flex justify-end gap-2">
              {selectedWebResults.size > 0 && (
                <Button variant="outline" onClick={copySelectedWebResultLinks}>
                  <Copy className="mr-2 h-4 w-4" />Copy {selectedWebResults.size} Link(s)
                </Button>
              )}
              <Dialog open={webResultDialog} onOpenChange={setWebResultDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetWebResultForm}><Plus className="mr-2 h-4 w-4" />Add Web Result</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>{editingWebResult ? "Edit" : "Add"} Web Result</DialogTitle></DialogHeader>
                  <form onSubmit={handleWebResultSubmit} className="space-y-4">
                    <div><Label>Related Search *</Label>
                      <Select value={webResultForm.related_search_id} onValueChange={(value) => setWebResultForm({...webResultForm, related_search_id: value})} required>
                        <SelectTrigger><SelectValue placeholder="Select related search" /></SelectTrigger>
                        <SelectContent>{relatedSearches.map((search) => <SelectItem key={search.id} value={search.id}>{search.search_text} (WR={search.display_order})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Title *</Label><Input value={webResultForm.title} onChange={(e) => setWebResultForm({...webResultForm, title: e.target.value})} required /></div>
                    <div><Label>Description</Label><Textarea value={webResultForm.description} onChange={(e) => setWebResultForm({...webResultForm, description: e.target.value})} rows={3} /></div>
                    <div><Label>Logo URL</Label><Input value={webResultForm.logo_url} onChange={(e) => setWebResultForm({...webResultForm, logo_url: e.target.value})} placeholder="https://example.com/logo.png" /></div>
                    <div><Label>Target URL *</Label><Input value={webResultForm.target_url} onChange={(e) => setWebResultForm({...webResultForm, target_url: e.target.value})} required placeholder="https://example.com" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Page Number</Label><Input type="number" value={webResultForm.page_number} onChange={(e) => setWebResultForm({...webResultForm, page_number: parseInt(e.target.value) || 1})} min="1" /></div>
                      <div><Label>Position</Label><Input type="number" value={webResultForm.position} onChange={(e) => setWebResultForm({...webResultForm, position: parseInt(e.target.value) || 1})} min="1" /></div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="active" checked={webResultForm.is_active} onChange={(e) => setWebResultForm({...webResultForm, is_active: e.target.checked})} className="rounded" />
                        <Label htmlFor="active">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sponsored" checked={webResultForm.is_sponsored} onChange={(e) => setWebResultForm({...webResultForm, is_sponsored: e.target.checked})} className="rounded" />
                        <Label htmlFor="sponsored">Sponsored Ad</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingWebResult ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetWebResultForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <BulkActionToolbar
              selectedCount={selectedWebResults.size}
              totalCount={webResults.length}
              onSelectAll={handleSelectAllWebResults}
              onDelete={handleBulkDeleteWebResults}
              onActivate={handleBulkActivateWebResults}
              onDeactivate={handleBulkDeactivateWebResults}
              isAllSelected={selectedWebResults.size === webResults.length && webResults.length > 0}
              selectedData={webResults.filter(w => selectedWebResults.has(w.id))}
              allData={webResults}
              csvColumns={['id', 'title', 'target_url', 'description', 'page_number', 'position', 'is_active', 'is_sponsored']}
              csvFilename="dataorbitzone_web_results"
              linkGenerator={(result) => {
                const search = relatedSearches.find(s => s.id === (result as WebResult).related_search_id);
                return `${getBaseUrl()}/dataorbit/wr?id=${search?.id}&wr=${search?.display_order || 1}`;
              }}
            />
            <div className="space-y-2">
              {webResults.map((result) => (
                <div key={result.id} className="flex items-center gap-3 p-4 border rounded">
                  <Checkbox
                    checked={selectedWebResults.has(result.id)}
                    onCheckedChange={() => toggleWebResultSelection(result.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{result.title}</h3>
                    <p className="text-sm text-muted-foreground">{result.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.target_url} • Page {result.page_number} • Position {result.position}
                      {result.is_sponsored && <span className="ml-2 text-primary font-medium">Sponsored</span>}
                      {!result.is_active && <span className="ml-2 text-destructive">Inactive</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyWebResultLink(result)} title="Copy Link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const search = relatedSearches.find(s => s.id === result.related_search_id);
                      window.open(`/dataorbit/wr?id=${search?.id}&wr=${search?.display_order || 1}`, '_blank');
                    }} title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { 
                      setEditingWebResult(result); 
                      setWebResultForm({
                        related_search_id: result.related_search_id || "",
                        title: result.title,
                        description: result.description || "",
                        logo_url: result.logo_url || "",
                        target_url: result.target_url,
                        page_number: result.page_number,
                        position: result.position,
                        is_active: result.is_active,
                        is_sponsored: result.is_sponsored
                      }); 
                      setWebResultDialog(true); 
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteWebResult(result.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
