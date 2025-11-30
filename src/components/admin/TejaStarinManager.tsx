import { useState, useEffect } from "react";
import { tejaStarinClient } from "@/integrations/tejastarin/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

export const TejaStarinManager = () => {
  const [activeTab, setActiveTab] = useState("blogs");
  
  // Blogs state
  const [blogs, setBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    author: "",
    content: "",
    category_id: "",
    featured_image: "",
    status: "published"
  });

  // Related Searches state
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [searchForm, setSearchForm] = useState({
    search_text: "",
    blog_id: "",
    wr_parameter: 1
  });

  // Web Results state
  const [webResults, setWebResults] = useState<any[]>([]);
  const [selectedSearchForResults, setSelectedSearchForResults] = useState("");
  const [webResultForm, setWebResultForm] = useState({
    title: "",
    url: "",
    description: "",
    logo_url: "",
    is_sponsored: false,
    wr_parameter: 1
  });

  // Pre-Landing state
  const [preLandingPages, setPreLandingPages] = useState<any[]>([]);
  const [preLandingForm, setPreLandingForm] = useState({
    related_search_id: "",
    headline: "",
    subtitle: "",
    description: "",
    logo_url: "",
    main_image_url: "",
    background_color: "#ffffff"
  });

  useEffect(() => {
    if (activeTab === "blogs") {
      fetchBlogs();
      fetchCategories();
    } else if (activeTab === "searches") {
      fetchRelatedSearches();
      fetchBlogs();
    } else if (activeTab === "webresults") {
      fetchWebResults();
      fetchRelatedSearches();
    } else if (activeTab === "prelanding") {
      fetchPreLandingPages();
      fetchRelatedSearches();
    }
  }, [activeTab]);

  // Fetch functions
  const fetchBlogs = async () => {
    const { data, error } = await tejaStarinClient
      .from("blogs")
      .select("*, category:categories(name)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch blogs");
      console.error(error);
    } else {
      setBlogs(data || []);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await tejaStarinClient
      .from("categories")
      .select("*")
      .order("name");
    if (error) {
      console.error(error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await tejaStarinClient
      .from("related_searches")
      .select("*, blog:blogs(title)")
      .order("search_text");
    if (error) {
      toast.error("Failed to fetch related searches");
      console.error(error);
    } else {
      setRelatedSearches(data || []);
    }
  };

  const fetchWebResults = async () => {
    if (!selectedSearchForResults) return;
    const { data, error } = await tejaStarinClient
      .from("web_results")
      .select("*")
      .eq("related_search_id", selectedSearchForResults)
      .order("is_sponsored", { ascending: false });
    if (error) {
      toast.error("Failed to fetch web results");
      console.error(error);
    } else {
      setWebResults(data || []);
    }
  };

  const fetchPreLandingPages = async () => {
    const { data, error } = await tejaStarinClient
      .from("pre_landing_config")
      .select("*, related_search:related_searches(search_text)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch pre-landing pages");
      console.error(error);
    } else {
      setPreLandingPages(data || []);
    }
  };

  // Blog handlers
  const handleSaveBlog = async () => {
    if (!blogForm.title || !blogForm.slug || !blogForm.author) {
      toast.error("Please fill in required fields");
      return;
    }

    const blogData = {
      ...blogForm,
      category_id: blogForm.category_id ? parseInt(blogForm.category_id) : null
    };

    let error;
    if (editingBlog) {
      const result = await tejaStarinClient
        .from("blogs")
        .update(blogData)
        .eq("id", editingBlog.id);
      error = result.error;
    } else {
      const result = await tejaStarinClient
        .from("blogs")
        .insert(blogData);
      error = result.error;
    }

    if (error) {
      toast.error("Failed to save blog");
      console.error(error);
    } else {
      toast.success(editingBlog ? "Blog updated!" : "Blog created!");
      setShowBlogForm(false);
      setEditingBlog(null);
      setBlogForm({
        title: "",
        slug: "",
        author: "",
        content: "",
        category_id: "",
        featured_image: "",
        status: "published"
      });
      fetchBlogs();
    }
  };

  const handleEditBlog = (blog: any) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title,
      slug: blog.slug,
      author: blog.author,
      content: blog.content,
      category_id: blog.category_id?.toString() || "",
      featured_image: blog.featured_image || "",
      status: blog.status || "published"
    });
    setShowBlogForm(true);
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    
    const { error } = await tejaStarinClient
      .from("blogs")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete blog");
      console.error(error);
    } else {
      toast.success("Blog deleted!");
      fetchBlogs();
    }
  };

  // Related Search handlers
  const handleSaveSearch = async () => {
    if (!searchForm.search_text || !searchForm.blog_id) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = await tejaStarinClient
      .from("related_searches")
      .insert({
        ...searchForm,
        blog_id: searchForm.blog_id
      });

    if (error) {
      toast.error("Failed to add related search");
      console.error(error);
    } else {
      toast.success("Related search added!");
      setSearchForm({ search_text: "", blog_id: "", wr_parameter: 1 });
      fetchRelatedSearches();
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    
    const { error } = await tejaStarinClient
      .from("related_searches")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete search");
    } else {
      toast.success("Search deleted!");
      fetchRelatedSearches();
    }
  };

  // Web Result handlers
  const handleSaveWebResult = async () => {
    if (!selectedSearchForResults || !webResultForm.title || !webResultForm.url) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = await tejaStarinClient
      .from("web_results")
      .insert({
        ...webResultForm,
        related_search_id: selectedSearchForResults
      });

    if (error) {
      toast.error("Failed to add web result");
      console.error(error);
    } else {
      toast.success("Web result added!");
      setWebResultForm({
        title: "",
        url: "",
        description: "",
        logo_url: "",
        is_sponsored: false,
        wr_parameter: 1
      });
      fetchWebResults();
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    
    const { error } = await tejaStarinClient
      .from("web_results")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete web result");
    } else {
      toast.success("Web result deleted!");
      fetchWebResults();
    }
  };

  // Pre-Landing handlers
  const handleSavePreLanding = async () => {
    if (!preLandingForm.related_search_id || !preLandingForm.headline) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = await tejaStarinClient
      .from("pre_landing_config")
      .insert(preLandingForm);

    if (error) {
      toast.error("Failed to save pre-landing page");
      console.error(error);
    } else {
      toast.success("Pre-landing page saved!");
      setPreLandingForm({
        related_search_id: "",
        headline: "",
        subtitle: "",
        description: "",
        logo_url: "",
        main_image_url: "",
        background_color: "#ffffff"
      });
      fetchPreLandingPages();
    }
  };

  const handleDeletePreLanding = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    
    const { error } = await tejaStarinClient
      .from("pre_landing_config")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete pre-landing page");
    } else {
      toast.success("Pre-landing page deleted!");
      fetchPreLandingPages();
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Teja Starin Manager</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="blogs">Blogs</TabsTrigger>
          <TabsTrigger value="searches">Related Searches</TabsTrigger>
          <TabsTrigger value="webresults">Web Results</TabsTrigger>
          <TabsTrigger value="prelanding">Pre-Landing</TabsTrigger>
        </TabsList>

        {/* Blogs Tab */}
        <TabsContent value="blogs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Blogs</h3>
            <Button onClick={() => {
              setShowBlogForm(!showBlogForm);
              setEditingBlog(null);
              setBlogForm({
                title: "",
                slug: "",
                author: "",
                content: "",
                category_id: "",
                featured_image: "",
                status: "published"
              });
            }}>
              {showBlogForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showBlogForm ? "Cancel" : "Add Blog"}
            </Button>
          </div>

          {showBlogForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingBlog ? "Edit Blog" : "Add New Blog"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={blogForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setBlogForm({ ...blogForm, title, slug: generateSlug(title) });
                    }}
                    placeholder="Blog title"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={blogForm.slug}
                    onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                    placeholder="blog-slug"
                  />
                </div>
                <div>
                  <Label>Author *</Label>
                  <Input
                    value={blogForm.author}
                    onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={blogForm.category_id} onValueChange={(value) => setBlogForm({ ...blogForm, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    placeholder="Blog content"
                    rows={6}
                  />
                </div>
                <div>
                  <Label>Featured Image URL</Label>
                  <Input
                    value={blogForm.featured_image}
                    onChange={(e) => setBlogForm({ ...blogForm, featured_image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={blogForm.status} onValueChange={(value) => setBlogForm({ ...blogForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveBlog} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {editingBlog ? "Update Blog" : "Create Blog"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">Author</th>
                      <th className="text-left p-4">Category</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map((blog) => (
                      <tr key={blog.id} className="border-b">
                        <td className="p-4 font-medium">{blog.title}</td>
                        <td className="p-4">{blog.author}</td>
                        <td className="p-4">{blog.category?.name || "-"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${blog.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {blog.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditBlog(blog)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteBlog(blog.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {blogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No blogs found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Searches Tab */}
        <TabsContent value="searches" className="space-y-4">
          <h3 className="text-xl font-semibold">Related Searches</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Add Related Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Blog</Label>
                <Select value={searchForm.blog_id} onValueChange={(value) => setSearchForm({ ...searchForm, blog_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blog" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogs.map((blog) => (
                      <SelectItem key={blog.id} value={blog.id}>
                        {blog.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Search Text</Label>
                <Input
                  value={searchForm.search_text}
                  onChange={(e) => setSearchForm({ ...searchForm, search_text: e.target.value })}
                  placeholder="Enter search text"
                />
              </div>
              <div>
                <Label>WR Parameter</Label>
                <Input
                  type="number"
                  value={searchForm.wr_parameter}
                  onChange={(e) => setSearchForm({ ...searchForm, wr_parameter: parseInt(e.target.value) || 1 })}
                />
              </div>
              <Button onClick={handleSaveSearch} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Search
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Search Text</th>
                      <th className="text-left p-4">Blog</th>
                      <th className="text-left p-4">WR Parameter</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedSearches.map((search) => (
                      <tr key={search.id} className="border-b">
                        <td className="p-4 font-medium">{search.search_text}</td>
                        <td className="p-4">{search.blog?.title || "-"}</td>
                        <td className="p-4">{search.wr_parameter}</td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSearch(search.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {relatedSearches.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No related searches found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Results Tab */}
        <TabsContent value="webresults" className="space-y-4">
          <h3 className="text-xl font-semibold">Web Results</h3>

          <Card>
            <CardHeader>
              <CardTitle>Select Related Search</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSearchForResults} onValueChange={(value) => {
                setSelectedSearchForResults(value);
                fetchWebResults();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select related search" />
                </SelectTrigger>
                <SelectContent>
                  {relatedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.search_text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedSearchForResults && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Add Web Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={webResultForm.title}
                      onChange={(e) => setWebResultForm({ ...webResultForm, title: e.target.value })}
                      placeholder="Result title"
                    />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input
                      value={webResultForm.url}
                      onChange={(e) => setWebResultForm({ ...webResultForm, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={webResultForm.description}
                      onChange={(e) => setWebResultForm({ ...webResultForm, description: e.target.value })}
                      placeholder="Description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      value={webResultForm.logo_url}
                      onChange={(e) => setWebResultForm({ ...webResultForm, logo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={webResultForm.is_sponsored}
                      onChange={(e) => setWebResultForm({ ...webResultForm, is_sponsored: e.target.checked })}
                      id="sponsored"
                    />
                    <Label htmlFor="sponsored">Is Sponsored</Label>
                  </div>
                  <Button onClick={handleSaveWebResult} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Web Result
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="text-left p-4">Title</th>
                          <th className="text-left p-4">URL</th>
                          <th className="text-left p-4">Sponsored</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webResults.map((result) => (
                          <tr key={result.id} className="border-b">
                            <td className="p-4 font-medium">{result.title}</td>
                            <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">{result.url}</td>
                            <td className="p-4">
                              {result.is_sponsored && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Sponsored</span>}
                            </td>
                            <td className="p-4 text-right">
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteWebResult(result.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {webResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No web results found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Pre-Landing Tab */}
        <TabsContent value="prelanding" className="space-y-4">
          <h3 className="text-xl font-semibold">Pre-Landing Pages</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Add Pre-Landing Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Related Search</Label>
                <Select value={preLandingForm.related_search_id} onValueChange={(value) => setPreLandingForm({ ...preLandingForm, related_search_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select related search" />
                  </SelectTrigger>
                  <SelectContent>
                    {relatedSearches.map((search) => (
                      <SelectItem key={search.id} value={search.id}>
                        {search.search_text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Headline *</Label>
                <Input
                  value={preLandingForm.headline}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, headline: e.target.value })}
                  placeholder="Main headline"
                />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input
                  value={preLandingForm.subtitle}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, subtitle: e.target.value })}
                  placeholder="Subtitle"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={preLandingForm.description}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, description: e.target.value })}
                  placeholder="Description"
                  rows={4}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={preLandingForm.logo_url}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Main Image URL</Label>
                <Input
                  value={preLandingForm.main_image_url}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, main_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={preLandingForm.background_color}
                  onChange={(e) => setPreLandingForm({ ...preLandingForm, background_color: e.target.value })}
                />
              </div>
              <Button onClick={handleSavePreLanding} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Pre-Landing Page
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Headline</th>
                      <th className="text-left p-4">Related Search</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preLandingPages.map((page) => (
                      <tr key={page.id} className="border-b">
                        <td className="p-4 font-medium">{page.headline}</td>
                        <td className="p-4">{page.related_search?.search_text || "-"}</td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePreLanding(page.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preLandingPages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No pre-landing pages found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
