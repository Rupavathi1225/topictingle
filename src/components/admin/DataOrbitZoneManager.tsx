import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export const DataOrbitZoneManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [prelandingPages, setPrelandingPages] = useState<PrelandingPage[]>([]);
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

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchCategories(),
      fetchBlogs(),
      fetchRelatedSearches(),
      fetchPrelandingPages()
    ]);
  };

  const fetchCategories = async () => {
    const { data, error } = await (supabase as any).from("dz_categories").select("*").order("id");
    if (error) toast.error("Failed to fetch categories: " + error.message);
    else setCategories((data as any) || []);
  };

  const fetchBlogs = async () => {
    const { data, error } = await (supabase as any).from("dz_blogs").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch blogs: " + error.message);
    else setBlogs((data as any) || []);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await (supabase as any)
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

  const fetchPrelandingPages = async () => {
    const { data, error } = await (supabase as any).from("dz_prelanding_pages").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch prelanding pages: " + error.message);
    else setPrelandingPages((data as any) || []);
  };

  // Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...categoryForm };
    
    if (editingCategory) {
      const { error } = await (supabase as any).from("dz_categories").update(data).eq("id", editingCategory.id);
      if (error) toast.error("Failed to update category");
      else { toast.success("Category updated"); fetchCategories(); resetCategoryForm(); }
    } else {
      const { error } = await (supabase as any).from("dz_categories").insert([data]);
      if (error) toast.error("Failed to create category");
      else { toast.success("Category created"); fetchCategories(); resetCategoryForm(); }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Delete this category?")) {
      const { error } = await (supabase as any).from("dz_categories").delete().eq("id", id);
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
      const { error } = await (supabase as any).from("dz_blogs").update(data).eq("id", editingBlog.id);
      if (error) toast.error("Failed to update blog");
      else { toast.success("Blog updated"); fetchBlogs(); resetBlogForm(); }
    } else {
      const { error } = await (supabase as any).from("dz_blogs").insert([data]);
      if (error) toast.error("Failed to create blog");
      else { toast.success("Blog created"); fetchBlogs(); resetBlogForm(); }
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm("Delete this blog?")) {
      const { error } = await (supabase as any).from("dz_blogs").delete().eq("id", id);
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
    
    const data = { ...searchForm, blog_id: searchForm.blog_id || null };
    
    if (editingSearch) {
      const { error } = await (supabase as any).from("dz_related_searches").update(data).eq("id", editingSearch.id);
      if (error) toast.error("Failed to update search");
      else { toast.success("Search updated"); fetchRelatedSearches(); resetSearchForm(); }
    } else {
      const { error } = await (supabase as any).from("dz_related_searches").insert([data]);
      if (error) toast.error("Failed to create search");
      else { toast.success("Search created"); fetchRelatedSearches(); resetSearchForm(); }
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Delete this search?")) {
      const { error } = await (supabase as any).from("dz_related_searches").delete().eq("id", id);
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
      const { error} = await (supabase as any).from("dz_prelanding_pages").update(data).eq("id", editingPrelanding.id);
      if (error) toast.error("Failed to update prelanding page");
      else { toast.success("Prelanding page updated"); fetchPrelandingPages(); resetPrelandingForm(); }
    } else {
      const { error } = await (supabase as any).from("dz_prelanding_pages").insert([data]);
      if (error) toast.error("Failed to create prelanding page");
      else { toast.success("Prelanding page created"); fetchPrelandingPages(); resetPrelandingForm(); }
    }
  };

  const handleDeletePrelanding = async (id: string) => {
    if (confirm("Delete this prelanding page?")) {
      const { error } = await (supabase as any).from("dz_prelanding_pages").delete().eq("id", id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Deleted"); fetchPrelandingPages(); }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>DataOrbitZone Manager</CardTitle>
        <CardDescription>Manage categories, blogs, related searches, and prelanding pages</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="blogs">Blogs ({blogs.length})</TabsTrigger>
            <TabsTrigger value="searches">Searches ({relatedSearches.length})</TabsTrigger>
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
