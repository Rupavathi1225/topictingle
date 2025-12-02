import { useState, useEffect } from "react";
import { dataOrbitZoneClient } from "@/integrations/dataorbitzone/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

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
  target_url: string;
  display_order: number;
}

interface PrelandingPage {
  id: string;
  related_search_id: string;
  logo_url?: string;
  logo_position: string;
  logo_size: number;
  main_image_url?: string;
  image_ratio: string;
  headline: string;
  description: string;
  headline_font_size: number;
  headline_color: string;
  description_font_size: number;
  description_color: string;
  text_alignment: string;
  email_box_color: string;
  email_box_border_color: string;
  button_text: string;
  button_color: string;
  button_text_color: string;
  background_color: string;
  background_image_url?: string;
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
  const [prelandingPages, setPrelandingPages] = useState<PrelandingPage[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [activeTab, setActiveTab] = useState("categories");

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

  // Related Search Form
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [searchForm, setSearchForm] = useState({
    blog_id: "", search_text: "", target_url: "", display_order: 0
  });

  // Prelanding Form
  const [prelandingDialog, setPrelandingDialog] = useState(false);
  const [editingPrelanding, setEditingPrelanding] = useState<PrelandingPage | null>(null);
  const [prelandingForm, setPrelandingForm] = useState({
    related_search_id: "", logo_url: "", logo_position: "top-center", logo_size: 100,
    main_image_url: "", image_ratio: "16:9", headline: "Welcome",
    description: "Check out this amazing resource", headline_font_size: 32,
    headline_color: "#000000", description_font_size: 16, description_color: "#666666",
    text_alignment: "center", email_box_color: "#ffffff", email_box_border_color: "#cccccc",
    button_text: "Continue", button_color: "#1a2942", button_text_color: "#ffffff",
    background_color: "#ffffff", background_image_url: ""
  });

  // Web Result Form
  const [webResultDialog, setWebResultDialog] = useState(false);
  const [editingWebResult, setEditingWebResult] = useState<WebResult | null>(null);
  const [webResultForm, setWebResultForm] = useState({
    related_search_id: "", title: "", description: "", logo_url: "",
    target_url: "", page_number: 1, position: 1, is_active: true, is_sponsored: false
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchCategories(),
      fetchBlogs(),
      fetchRelatedSearches(),
      fetchPrelandingPages(),
      fetchWebResults()
    ]);
  };

  const fetchCategories = async () => {
    const { data, error } = await dataOrbitZoneClient.from("categories").select("*").order("id");
    if (error) toast.error("Failed to fetch categories: " + error.message);
    else setCategories((data as any) || []);
  };

  const fetchBlogs = async () => {
    const { data, error } = await dataOrbitZoneClient.from("blogs").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch blogs: " + error.message);
    else setBlogs((data as any) || []);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await dataOrbitZoneClient
      .from("related_searches")
      .select("*")
      .order("display_order");
    if (error) {
      console.error('Error fetching related searches:', error);
      toast.error("Failed to fetch related searches");
    } else {
      setRelatedSearches((data as any) || []);
    }
  };

  const fetchPrelandingPages = async () => {
    const { data, error } = await dataOrbitZoneClient.from("prelanding_pages").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch prelanding pages: " + error.message);
    else setPrelandingPages((data as any) || []);
  };

  const fetchWebResults = async () => {
    const { data, error } = await dataOrbitZoneClient.from("web_results").select("*").order("page_number", { ascending: true });
    if (error) toast.error("Failed to fetch web results: " + error.message);
    else setWebResults((data as any) || []);
  };

  // Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...categoryForm };
    
    if (editingCategory) {
      const { error } = await dataOrbitZoneClient.from("categories").update(data).eq("id", editingCategory.id);
      if (error) toast.error("Failed to update category");
      else { toast.success("Category updated"); fetchCategories(); resetCategoryForm(); }
    } else {
      const { error } = await dataOrbitZoneClient.from("categories").insert([data]);
      if (error) toast.error("Failed to create category");
      else { toast.success("Category created"); fetchCategories(); resetCategoryForm(); }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Delete this category?")) {
      const { error } = await dataOrbitZoneClient.from("categories").delete().eq("id", id);
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
      const { error } = await dataOrbitZoneClient.from("blogs").update(data).eq("id", editingBlog.id);
      if (error) toast.error("Failed to update blog");
      else { toast.success("Blog updated"); fetchBlogs(); resetBlogForm(); }
    } else {
      const { error } = await dataOrbitZoneClient.from("blogs").insert([data]);
      if (error) toast.error("Failed to create blog");
      else { toast.success("Blog created"); fetchBlogs(); resetBlogForm(); }
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm("Delete this blog?")) {
      const { error } = await dataOrbitZoneClient.from("blogs").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchBlogs(); }
    }
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: "", slug: "", category_id: "", author: "", content: "",
      featured_image: "", status: "published", author_bio: "", author_image: ""
    });
    setEditingBlog(null);
    setBlogDialog(false);
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
      target_url: searchForm.target_url,
      display_order: searchForm.display_order
    };
    
    if (editingSearch) {
      const { error } = await dataOrbitZoneClient.from("related_searches").update(data).eq("id", editingSearch.id);
      if (error) {
        console.error('Update error:', error);
        toast.error("Failed to update search: " + error.message);
      } else {
        toast.success("Search updated");
        fetchRelatedSearches();
        resetSearchForm();
      }
    } else {
      const { error } = await dataOrbitZoneClient.from("related_searches").insert([data]);
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
      const { error } = await dataOrbitZoneClient.from("related_searches").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchRelatedSearches(); }
    }
  };

  const resetSearchForm = () => {
    setSearchForm({ blog_id: "", search_text: "", target_url: "", display_order: 0 });
    setEditingSearch(null);
    setSearchDialog(false);
  };

  // Prelanding CRUD
  const handlePrelandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...prelandingForm };
    
    if (editingPrelanding) {
      const { error} = await dataOrbitZoneClient.from("prelanding_pages").update(data).eq("id", editingPrelanding.id);
      if (error) toast.error("Failed to update prelanding page");
      else { toast.success("Prelanding page updated"); fetchPrelandingPages(); resetPrelandingForm(); }
    } else {
      const { error } = await dataOrbitZoneClient.from("prelanding_pages").insert([data]);
      if (error) toast.error("Failed to create prelanding page");
      else { toast.success("Prelanding page created"); fetchPrelandingPages(); resetPrelandingForm(); }
    }
  };

  const handleDeletePrelanding = async (id: string) => {
    if (confirm("Delete this prelanding page?")) {
      const { error } = await dataOrbitZoneClient.from("prelanding_pages").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchPrelandingPages(); }
    }
  };

  // Web Result CRUD
  const handleWebResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...webResultForm,
      related_search_id: webResultForm.related_search_id || null,
      page_number: parseInt(webResultForm.page_number.toString()),
      position: parseInt(webResultForm.position.toString())
    };
    
    if (editingWebResult) {
      const { error } = await dataOrbitZoneClient.from("web_results").update(data).eq("id", editingWebResult.id);
      if (error) toast.error("Failed to update web result");
      else { toast.success("Web result updated"); fetchWebResults(); resetWebResultForm(); }
    } else {
      const { error } = await dataOrbitZoneClient.from("web_results").insert([data]);
      if (error) toast.error("Failed to create web result");
      else { toast.success("Web result created"); fetchWebResults(); resetWebResultForm(); }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (confirm("Delete this web result?")) {
      const { error } = await dataOrbitZoneClient.from("web_results").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchWebResults(); }
    }
  };

  const resetPrelandingForm = () => {
    setPrelandingForm({
      related_search_id: "", logo_url: "", logo_position: "top-center", logo_size: 100,
      main_image_url: "", image_ratio: "16:9", headline: "Welcome",
      description: "Check out this amazing resource", headline_font_size: 32,
      headline_color: "#000000", description_font_size: 16, description_color: "#666666",
      text_alignment: "center", email_box_color: "#ffffff", email_box_border_color: "#cccccc",
      button_text: "Continue", button_color: "#1a2942", button_text_color: "#ffffff",
      background_color: "#ffffff", background_image_url: ""
    });
    setEditingPrelanding(null);
    setPrelandingDialog(false);
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
        <CardDescription>Manage categories, blogs, related searches, and prelanding pages</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="blogs">Blogs ({blogs.length})</TabsTrigger>
            <TabsTrigger value="searches">Searches ({relatedSearches.length})</TabsTrigger>
            <TabsTrigger value="webresults">Web Results ({webResults.length})</TabsTrigger>
            <TabsTrigger value="prelanding">Prelanding ({prelandingPages.length})</TabsTrigger>
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
            <div className="flex justify-end">
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
                    <div><Label>Author Bio</Label><Input value={blogForm.author_bio} onChange={(e) => setBlogForm({...blogForm, author_bio: e.target.value})} /></div>
                    <div><Label>Author Image URL</Label><Input value={blogForm.author_image} onChange={(e) => setBlogForm({...blogForm, author_image: e.target.value})} /></div>
                    <div><Label>Featured Image URL</Label><Input value={blogForm.featured_image} onChange={(e) => setBlogForm({...blogForm, featured_image: e.target.value})} /></div>
                    <div><Label>Content *</Label><Textarea value={blogForm.content} onChange={(e) => setBlogForm({...blogForm, content: e.target.value})} rows={10} required /></div>
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
            <div className="space-y-2">
              {blogs.map((blog) => (
                <div key={blog.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h3 className="font-semibold">{blog.title}</h3>
                    <p className="text-sm text-muted-foreground">{blog.slug} • {blog.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingBlog(blog); setBlogForm({title: blog.title, slug: blog.slug, category_id: blog.category_id?.toString() || "", author: blog.author, content: blog.content, featured_image: blog.featured_image || "", status: blog.status, author_bio: blog.author_bio || "", author_image: blog.author_image || ""}); setBlogDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteBlog(blog.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Related Searches Tab */}
          <TabsContent value="searches" className="space-y-4">
            <div className="flex justify-end">
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
                      {searchForm.blog_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Adding related search to: <span className="font-semibold">{blogs.find(b => b.id === searchForm.blog_id)?.title}</span>
                        </p>
                      )}
                    </div>
                    <div><Label>Search Text *</Label><Input value={searchForm.search_text} onChange={(e) => setSearchForm({...searchForm, search_text: e.target.value})} required /></div>
                    <div><Label>Target URL *</Label><Input value={searchForm.target_url} onChange={(e) => setSearchForm({...searchForm, target_url: e.target.value})} required /></div>
                    <div><Label>Display Order</Label><Input type="number" value={searchForm.display_order} onChange={(e) => setSearchForm({...searchForm, display_order: parseInt(e.target.value)})} /></div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingSearch ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetSearchForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {relatedSearches.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h3 className="font-semibold">{search.search_text}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(search as any).dz_blogs?.title && <span className="text-primary font-medium">Blog: {(search as any).dz_blogs.title} | </span>}
                      {search.target_url} • Order: {search.display_order}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingSearch(search); setSearchForm({blog_id: search.blog_id || "", search_text: search.search_text, target_url: search.target_url, display_order: search.display_order}); setSearchDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSearch(search.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Web Results Tab */}
          <TabsContent value="webresults" className="space-y-4">
            <div className="flex justify-end">
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
                        <SelectContent>{relatedSearches.map((search) => <SelectItem key={search.id} value={search.id}>{search.search_text}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2">
              {webResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded">
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

          {/* Prelanding Pages Tab */}
          <TabsContent value="prelanding" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={prelandingDialog} onOpenChange={setPrelandingDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetPrelandingForm}><Plus className="mr-2 h-4 w-4" />New Prelanding</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingPrelanding ? "Edit" : "Create"} Prelanding Page</DialogTitle></DialogHeader>
                  <form onSubmit={handlePrelandingSubmit} className="space-y-4">
                    <div><Label>Related Search *</Label>
                      <Select value={prelandingForm.related_search_id} onValueChange={(value) => setPrelandingForm({...prelandingForm, related_search_id: value})} required>
                        <SelectTrigger><SelectValue placeholder="Select search" /></SelectTrigger>
                        <SelectContent>{relatedSearches.map((search) => <SelectItem key={search.id} value={search.id}>{search.search_text} ››› {search.target_url} {(search as any).dz_blogs?.title && `››› ${(search as any).dz_blogs.title}`}</SelectItem>)}</SelectContent>
                      </Select>
                      {prelandingForm.related_search_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Adding pre-landing page to: <span className="font-semibold">{relatedSearches.find(s => s.id === prelandingForm.related_search_id)?.search_text}</span>
                        </p>
                      )}
                    </div>
                    <div><Label>Logo URL</Label><Input value={prelandingForm.logo_url} onChange={(e) => setPrelandingForm({...prelandingForm, logo_url: e.target.value})} /></div>
                    <div><Label>Main Image URL</Label><Input value={prelandingForm.main_image_url} onChange={(e) => setPrelandingForm({...prelandingForm, main_image_url: e.target.value})} /></div>
                    <div><Label>Headline</Label><Input value={prelandingForm.headline} onChange={(e) => setPrelandingForm({...prelandingForm, headline: e.target.value})} /></div>
                    <div><Label>Description</Label><Textarea value={prelandingForm.description} onChange={(e) => setPrelandingForm({...prelandingForm, description: e.target.value})} /></div>
                    <div><Label>Button Text</Label><Input value={prelandingForm.button_text} onChange={(e) => setPrelandingForm({...prelandingForm, button_text: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Button Color</Label><Input type="color" value={prelandingForm.button_color} onChange={(e) => setPrelandingForm({...prelandingForm, button_color: e.target.value})} /></div>
                      <div><Label>Button Text Color</Label><Input type="color" value={prelandingForm.button_text_color} onChange={(e) => setPrelandingForm({...prelandingForm, button_text_color: e.target.value})} /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">{editingPrelanding ? "Update" : "Create"}</Button>
                      <Button type="button" variant="outline" onClick={resetPrelandingForm}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {prelandingPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h3 className="font-semibold">{page.headline}</h3>
                    <p className="text-sm text-muted-foreground">{page.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { 
                      setEditingPrelanding(page); 
                      setPrelandingForm({
                        related_search_id: page.related_search_id,
                        logo_url: page.logo_url || "",
                        logo_position: page.logo_position,
                        logo_size: page.logo_size,
                        main_image_url: page.main_image_url || "",
                        image_ratio: page.image_ratio,
                        headline: page.headline,
                        description: page.description,
                        headline_font_size: page.headline_font_size,
                        headline_color: page.headline_color,
                        description_font_size: page.description_font_size,
                        description_color: page.description_color,
                        text_alignment: page.text_alignment,
                        email_box_color: page.email_box_color,
                        email_box_border_color: page.email_box_border_color,
                        button_text: page.button_text,
                        button_color: page.button_color,
                        button_text_color: page.button_text_color,
                        background_color: page.background_color,
                        background_image_url: page.background_image_url || ""
                      }); 
                      setPrelandingDialog(true); 
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePrelanding(page.id)}><Trash2 className="h-4 w-4" /></Button>
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
