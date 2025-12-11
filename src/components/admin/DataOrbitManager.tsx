import { useEffect, useState } from "react";
import { dataOrbitClient } from "@/integrations/dataorbit/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Settings, ChevronRight } from "lucide-react";
import { BlogImageSelector } from "./BlogImageSelector";
import { BulkActionToolbar } from "./BulkActionToolbar";

interface Blog {
  id: string;
  serial_number: number;
  title: string;
  slug: string;
  content: string;
  featured_image: string;
  author: string;
  author_bio: string | null;
  author_image: string | null;
  category_id: number | null;
  status: string;
  published_at: string;
  categories?: { name: string } | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface RelatedSearch {
  id: string;
  title: string;
  position: number;
  blog_id: string;
  web_result_page: number;
  blogs?: { title: string } | null;
}

interface WebResult {
  id: string;
  name: string;
  logo: string | null;
  url: string;
  title: string;
  description: string | null;
  is_sponsored: boolean;
  position: number;
  related_search_id: string;
  related_searches?: { title: string; web_result_page: number; blogs: { title: string } | null } | null;
}

interface PreLandingConfig {
  id: string;
  web_result_id: string;
  logo_url: string | null;
  logo_size: number;
  main_image_url: string | null;
  headline: string | null;
  description: string | null;
  headline_font_size: number;
  headline_color: string;
  description_color: string;
  button_text: string;
  button_color: string;
  background_color: string;
  background_image: string | null;
  countdown_seconds: number;
}

interface DataOrbitManagerProps {
  initialTab?: string;
}

export function DataOrbitManager({ initialTab = 'blogs' }: DataOrbitManagerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  
  // Selection states for bulk actions
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [selectedWebResults, setSelectedWebResults] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [blogDialog, setBlogDialog] = useState(false);
  const [searchDialog, setSearchDialog] = useState(false);
  const [webResultDialog, setWebResultDialog] = useState(false);
  const [preLandingDialog, setPreLandingDialog] = useState(false);
  
  // Editing states
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [editingWebResult, setEditingWebResult] = useState<WebResult | null>(null);
  const [selectedWebResultForPreLanding, setSelectedWebResultForPreLanding] = useState<WebResult | null>(null);
  
  // Form states
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    content: '',
    featured_image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
    author: '',
    author_bio: '',
    author_image: '',
    category_id: '',
    status: 'draft',
  });
  
  const [searchForm, setSearchForm] = useState({
    title: '',
    blog_id: '',
    position: '1',
    web_result_page: '1',
  });
  
  const [webResultForm, setWebResultForm] = useState({
    name: '',
    logo: '',
    url: '',
    title: '',
    description: '',
    is_sponsored: false,
    position: '1',
    related_search_id: '',
    forceReplace: false,
  });
  
  const [preLandingForm, setPreLandingForm] = useState({
    logo_url: '',
    logo_size: '100',
    main_image_url: '',
    headline: '',
    description: '',
    headline_font_size: '32',
    headline_color: '#ffffff',
    description_color: '#cccccc',
    button_text: 'Visit Now',
    button_color: '#3b82f6',
    background_color: '#1a1a2e',
    countdown_seconds: '3',
    background_image: '',
  });

  // Pre-landing selection
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [filteredResults, setFilteredResults] = useState<WebResult[]>([]);

  useEffect(() => {
    const tabMap: Record<string, string> = {
      'blogs': 'blogs',
      'searches': 'related-searches',
      'webresults': 'web-results',
      'prelanding': 'pre-landing',
    };
    if (tabMap[initialTab]) {
      setActiveTab(tabMap[initialTab]);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (selectedSearch) {
      const filtered = webResults.filter(wr => wr.related_search_id === selectedSearch);
      setFilteredResults(filtered);
      setSelectedResult('');
    } else {
      setFilteredResults([]);
    }
  }, [selectedSearch, webResults]);

  useEffect(() => {
    if (selectedResult) {
      loadPreLandingConfig();
    }
  }, [selectedResult]);

  const fetchAll = async () => {
    setLoading(true);
    const [blogsRes, catsRes, searchesRes, resultsRes] = await Promise.all([
      dataOrbitClient.from('blogs').select('*, categories(name)').order('created_at', { ascending: false }),
      dataOrbitClient.from('categories').select('*').order('id'),
      dataOrbitClient.from('related_searches').select('*, blogs(title)').order('created_at', { ascending: false }),
      dataOrbitClient.from('web_results').select('*, related_searches(title, web_result_page, blogs(title))').order('created_at', { ascending: false }),
    ]);
    
    if (blogsRes.data) setBlogs(blogsRes.data as Blog[]);
    if (catsRes.data) setCategories(catsRes.data);
    if (searchesRes.data) setSearches(searchesRes.data as RelatedSearch[]);
    if (resultsRes.data) setWebResults(resultsRes.data as WebResult[]);
    setLoading(false);
  };

  const loadPreLandingConfig = async () => {
    const { data } = await dataOrbitClient
      .from('pre_landing_config')
      .select('*')
      .eq('web_result_id', selectedResult)
      .maybeSingle();
    
    if (data) {
      setPreLandingForm({
        logo_url: data.logo_url || '',
        logo_size: data.logo_size?.toString() || '100',
        main_image_url: data.main_image_url || '',
        headline: data.headline || '',
        description: data.description || '',
        headline_font_size: data.headline_font_size?.toString() || '32',
        headline_color: data.headline_color || '#ffffff',
        description_color: data.description_color || '#cccccc',
        button_text: data.button_text || 'Visit Now',
        button_color: data.button_color || '#3b82f6',
        background_color: data.background_color || '#1a1a2e',
        countdown_seconds: data.countdown_seconds?.toString() || '3',
        background_image: data.background_image || '',
      });
    } else {
      resetPreLandingForm();
    }
  };

  // Generate slug
  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  // Blog handlers
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const blogData = {
      title: blogForm.title,
      slug: blogForm.slug,
      content: blogForm.content,
      featured_image: blogForm.featured_image,
      author: blogForm.author,
      author_bio: blogForm.author_bio || null,
      author_image: blogForm.author_image || null,
      category_id: blogForm.category_id ? parseInt(blogForm.category_id) : null,
      status: blogForm.status,
      published_at: blogForm.status === 'published' ? new Date().toISOString() : null,
    };
    
    if (editingBlog) {
      const { error } = await dataOrbitClient.from('blogs').update(blogData).eq('id', editingBlog.id);
      if (error) toast.error(error.message);
      else { toast.success('Blog updated'); setBlogDialog(false); fetchAll(); }
    } else {
      const { error } = await dataOrbitClient.from('blogs').insert(blogData);
      if (error) toast.error(error.message);
      else { toast.success('Blog created'); setBlogDialog(false); fetchAll(); }
    }
    resetBlogForm();
  };

  const handleEditBlog = (blog: Blog) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      featured_image: blog.featured_image,
      author: blog.author,
      author_bio: blog.author_bio || '',
      author_image: blog.author_image || '',
      category_id: blog.category_id?.toString() || '',
      status: blog.status,
    });
    setBlogDialog(true);
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Delete this blog?')) return;
    const { error } = await dataOrbitClient.from('blogs').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Blog deleted'); fetchAll(); }
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: '',
      slug: '',
      content: '',
      featured_image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
      author: '',
      author_bio: '',
      author_image: '',
      category_id: '',
      status: 'draft',
    });
    setEditingBlog(null);
  };

  // Related Search handlers
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchData = {
      title: searchForm.title,
      blog_id: searchForm.blog_id,
      position: parseInt(searchForm.position),
      web_result_page: parseInt(searchForm.web_result_page),
    };
    
    if (editingSearch) {
      const { error } = await dataOrbitClient.from('related_searches').update(searchData).eq('id', editingSearch.id);
      if (error) toast.error(error.message);
      else { toast.success('Related search updated'); setSearchDialog(false); fetchAll(); }
    } else {
      const { error } = await dataOrbitClient.from('related_searches').insert(searchData);
      if (error) toast.error(error.message);
      else { toast.success('Related search created'); setSearchDialog(false); fetchAll(); }
    }
    resetSearchForm();
  };

  const handleEditSearch = (search: RelatedSearch) => {
    setEditingSearch(search);
    setSearchForm({
      title: search.title,
      blog_id: search.blog_id,
      position: search.position.toString(),
      web_result_page: search.web_result_page.toString(),
    });
    setSearchDialog(true);
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm('Delete this related search?')) return;
    const { error } = await dataOrbitClient.from('related_searches').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Related search deleted'); fetchAll(); }
  };

  const resetSearchForm = () => {
    setSearchForm({ title: '', blog_id: '', position: '1', web_result_page: '1' });
    setEditingSearch(null);
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
    await dataOrbitClient.from('blogs').delete().in('id', Array.from(selectedBlogs));
    toast.success(`${selectedBlogs.size} blog(s) deleted`);
    setSelectedBlogs(new Set());
    fetchAll();
  };

  const handleBulkActivateBlogs = async () => {
    await dataOrbitClient.from('blogs').update({ status: 'published' }).in('id', Array.from(selectedBlogs));
    toast.success(`${selectedBlogs.size} blog(s) published`);
    setSelectedBlogs(new Set());
    fetchAll();
  };

  const handleBulkDeactivateBlogs = async () => {
    await dataOrbitClient.from('blogs').update({ status: 'draft' }).in('id', Array.from(selectedBlogs));
    toast.success(`${selectedBlogs.size} blog(s) set to draft`);
    setSelectedBlogs(new Set());
    fetchAll();
  };

  // Bulk action handlers for Related Searches
  const toggleSearchSelection = (id: string) => {
    const newSelected = new Set(selectedSearches);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedSearches(newSelected);
  };

  const handleSelectAllSearches = () => {
    if (selectedSearches.size === searches.length) setSelectedSearches(new Set());
    else setSelectedSearches(new Set(searches.map(s => s.id)));
  };

  const handleBulkDeleteSearches = async () => {
    if (!confirm(`Delete ${selectedSearches.size} related search(es)?`)) return;
    await dataOrbitClient.from('related_searches').delete().in('id', Array.from(selectedSearches));
    toast.success(`${selectedSearches.size} related search(es) deleted`);
    setSelectedSearches(new Set());
    fetchAll();
  };

  const handleBulkActivateSearches = async () => {
    toast.success(`${selectedSearches.size} related search(es) activated`);
    setSelectedSearches(new Set());
  };

  const handleBulkDeactivateSearches = async () => {
    toast.success(`${selectedSearches.size} related search(es) deactivated`);
    setSelectedSearches(new Set());
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
    await dataOrbitClient.from('web_results').delete().in('id', Array.from(selectedWebResults));
    toast.success(`${selectedWebResults.size} web result(s) deleted`);
    setSelectedWebResults(new Set());
    fetchAll();
  };

  const handleBulkActivateWebResults = async () => {
    toast.success(`${selectedWebResults.size} web result(s) activated`);
    setSelectedWebResults(new Set());
  };

  const handleBulkDeactivateWebResults = async () => {
    toast.success(`${selectedWebResults.size} web result(s) deactivated`);
    setSelectedWebResults(new Set());
  };

  // Web Result handlers
  const handleWebResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const position = parseInt(webResultForm.position);
    
    // Check for position conflict
    const existingResult = webResults.find(
      wr => wr.related_search_id === webResultForm.related_search_id && 
            wr.position === position && 
            wr.id !== editingWebResult?.id
    );
    
    if (existingResult && !webResultForm.forceReplace) {
      toast.error(`Position ${position} is already taken by "${existingResult.name}". Check "Force replace" to overwrite.`);
      return;
    }
    
    // If force replace, delete the existing result first
    if (existingResult && webResultForm.forceReplace) {
      await dataOrbitClient.from('web_results').delete().eq('id', existingResult.id);
    }
    
    const resultData = {
      name: webResultForm.name,
      logo: webResultForm.logo || null,
      url: webResultForm.url,
      title: webResultForm.title,
      description: webResultForm.description || null,
      is_sponsored: webResultForm.is_sponsored,
      position: position,
      related_search_id: webResultForm.related_search_id,
    };
    
    if (editingWebResult) {
      const { error } = await dataOrbitClient.from('web_results').update(resultData).eq('id', editingWebResult.id);
      if (error) toast.error(error.message);
      else { toast.success('Web result updated'); setWebResultDialog(false); fetchAll(); }
    } else {
      const { error } = await dataOrbitClient.from('web_results').insert(resultData);
      if (error) toast.error(error.message);
      else { toast.success('Web result created'); setWebResultDialog(false); fetchAll(); }
    }
    resetWebResultForm();
  };

  const handleEditWebResult = (result: WebResult) => {
    setEditingWebResult(result);
    setWebResultForm({
      name: result.name,
      logo: result.logo || '',
      url: result.url,
      title: result.title,
      description: result.description || '',
      is_sponsored: result.is_sponsored,
      position: result.position.toString(),
      related_search_id: result.related_search_id,
      forceReplace: false,
    });
    setWebResultDialog(true);
  };

  const handleDeleteWebResult = async (id: string) => {
    if (!confirm('Delete this web result?')) return;
    const { error } = await dataOrbitClient.from('web_results').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Web result deleted'); fetchAll(); }
  };

  const resetWebResultForm = () => {
    setWebResultForm({
      name: '',
      logo: '',
      url: '',
      title: '',
      description: '',
      is_sponsored: false,
      position: '1',
      related_search_id: '',
      forceReplace: false,
    });
    setEditingWebResult(null);
  };

  // Get occupied positions for selected related search
  const getOccupiedPositions = () => {
    if (!webResultForm.related_search_id) return [];
    return webResults
      .filter(wr => wr.related_search_id === webResultForm.related_search_id && wr.id !== editingWebResult?.id)
      .map(wr => ({ position: wr.position, name: wr.name }));
  };

  const occupiedPositions = getOccupiedPositions();
  const currentPosition = parseInt(webResultForm.position) || 0;
  const positionConflict = occupiedPositions.find(p => p.position === currentPosition);

  const openPreLanding = async (result: WebResult) => {
    setSelectedWebResultForPreLanding(result);
    const { data } = await dataOrbitClient.from('pre_landing_config').select('*').eq('web_result_id', result.id).maybeSingle();
    if (data) {
      setPreLandingForm({
        logo_url: data.logo_url || '',
        logo_size: data.logo_size?.toString() || '100',
        main_image_url: data.main_image_url || '',
        headline: data.headline || '',
        description: data.description || '',
        headline_font_size: data.headline_font_size?.toString() || '32',
        headline_color: data.headline_color || '#ffffff',
        description_color: data.description_color || '#cccccc',
        button_text: data.button_text || 'Visit Now',
        button_color: data.button_color || '#3b82f6',
        background_color: data.background_color || '#1a1a2e',
        countdown_seconds: data.countdown_seconds?.toString() || '3',
        background_image: data.background_image || '',
      });
    } else {
      resetPreLandingForm();
    }
    setPreLandingDialog(true);
  };

  // Pre-landing handlers
  const handlePreLandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult && !selectedWebResultForPreLanding) {
      toast.error('Please select a web result');
      return;
    }
    
    const webResultId = selectedWebResultForPreLanding?.id || selectedResult;
    
    const data = {
      web_result_id: webResultId,
      logo_url: preLandingForm.logo_url || null,
      logo_size: parseInt(preLandingForm.logo_size),
      main_image_url: preLandingForm.main_image_url || null,
      headline: preLandingForm.headline || null,
      description: preLandingForm.description || null,
      headline_font_size: parseInt(preLandingForm.headline_font_size),
      headline_color: preLandingForm.headline_color,
      description_color: preLandingForm.description_color,
      button_text: preLandingForm.button_text,
      button_color: preLandingForm.button_color,
      background_color: preLandingForm.background_color,
      countdown_seconds: parseInt(preLandingForm.countdown_seconds),
      background_image: preLandingForm.background_image || null,
    };
    
    const { data: existing } = await dataOrbitClient.from('pre_landing_config').select('id').eq('web_result_id', webResultId).maybeSingle();
    
    if (existing) {
      const { error } = await dataOrbitClient.from('pre_landing_config').update(data).eq('web_result_id', webResultId);
      if (error) toast.error(error.message);
      else toast.success('Pre-landing config updated');
    } else {
      const { error } = await dataOrbitClient.from('pre_landing_config').insert(data);
      if (error) toast.error(error.message);
      else toast.success('Pre-landing config created');
    }
    setPreLandingDialog(false);
  };

  const resetPreLandingForm = () => {
    setPreLandingForm({
      logo_url: '',
      logo_size: '100',
      main_image_url: '',
      headline: '',
      description: '',
      headline_font_size: '32',
      headline_color: '#ffffff',
      description_color: '#cccccc',
      button_text: 'Visit Now',
      button_color: '#3b82f6',
      background_color: '#1a1a2e',
      countdown_seconds: '3',
      background_image: '',
    });
  };

  const selectedSearchData = searches.find(s => s.id === selectedSearch);
  const selectedResultData = filteredResults.find(r => r.id === selectedResult);
  const selectedWebResultSearch = searches.find(s => s.id === webResultForm.related_search_id);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          DataOrbit Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="blogs">Blogs</TabsTrigger>
            <TabsTrigger value="related-searches">Related Searches</TabsTrigger>
            <TabsTrigger value="web-results">Web Results</TabsTrigger>
            <TabsTrigger value="pre-landing">Pre-Landing</TabsTrigger>
          </TabsList>
          
          {/* BLOGS TAB */}
          <TabsContent value="blogs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Blogs</h2>
              <Dialog open={blogDialog} onOpenChange={(open) => { setBlogDialog(open); if (!open) resetBlogForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Blog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBlog ? 'Edit Blog' : 'Create Blog'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBlogSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value, slug: generateSlug(e.target.value) })} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Slug</label>
                      <Input value={blogForm.slug} onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select value={blogForm.category_id} onValueChange={(v) => setBlogForm({ ...blogForm, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Content</label>
                      <Textarea value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} rows={8} required />
                    </div>
                    <BlogImageSelector
                      blogTitle={blogForm.title}
                      imageUrl={blogForm.featured_image}
                      onImageChange={(url) => setBlogForm({ ...blogForm, featured_image: url })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Author Name</label>
                        <Input value={blogForm.author} onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Author Image URL</label>
                        <Input value={blogForm.author_image} onChange={(e) => setBlogForm({ ...blogForm, author_image: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Author Bio</label>
                      <Textarea value={blogForm.author_bio} onChange={(e) => setBlogForm({ ...blogForm, author_bio: e.target.value })} rows={2} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select value={blogForm.status} onValueChange={(v) => setBlogForm({ ...blogForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">{editingBlog ? 'Update Blog' : 'Create Blog'}</Button>
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
              csvColumns={['id', 'title', 'slug', 'author', 'status', 'category_id', 'serial_number']}
              csvFilename="dataorbit_blogs"
              linkGenerator={(blog) => {
                const category = categories.find(c => c.id === (blog as Blog).category_id);
                return `${window.location.origin}/dataorbit/blog/${category?.slug || 'general'}/${(blog as Blog).slug}`;
              }}
            />
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium w-12">
                      <Checkbox checked={selectedBlogs.size === blogs.length && blogs.length > 0} onCheckedChange={handleSelectAllBlogs} />
                    </th>
                    <th className="text-left p-4 text-sm font-medium">#</th>
                    <th className="text-left p-4 text-sm font-medium">Title</th>
                    <th className="text-left p-4 text-sm font-medium">Category</th>
                    <th className="text-left p-4 text-sm font-medium">Author</th>
                    <th className="text-left p-4 text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((blog) => (
                    <tr key={blog.id} className={`border-t border-border ${selectedBlogs.has(blog.id) ? 'bg-muted/50' : ''}`}>
                      <td className="p-4">
                        <Checkbox checked={selectedBlogs.has(blog.id)} onCheckedChange={() => toggleBlogSelection(blog.id)} />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{blog.serial_number}</td>
                      <td className="p-4 text-sm">{blog.title}</td>
                      <td className="p-4 text-sm text-muted-foreground">{blog.categories?.name || '-'}</td>
                      <td className="p-4 text-sm text-muted-foreground">{blog.author}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded ${blog.status === 'published' ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditBlog(blog)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteBlog(blog.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* RELATED SEARCHES TAB */}
          <TabsContent value="related-searches">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Related Searches</h2>
              <Dialog open={searchDialog} onOpenChange={(open) => { setSearchDialog(open); if (!open) resetSearchForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Related Search</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSearch ? 'Edit Related Search' : 'Add Related Search'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Blog *</label>
                      <Select value={searchForm.blog_id} onValueChange={(v) => setSearchForm({ ...searchForm, blog_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select blog" /></SelectTrigger>
                        <SelectContent>
                          {blogs.map((blog) => (
                            <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input value={searchForm.title} onChange={(e) => setSearchForm({ ...searchForm, title: e.target.value })} placeholder="e.g., Best Social Media Platforms 2024" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Web Result Page (1-4)</label>
                        <Select value={searchForm.web_result_page} onValueChange={(v) => setSearchForm({ ...searchForm, web_result_page: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Page 1</SelectItem>
                            <SelectItem value="2">Page 2</SelectItem>
                            <SelectItem value="3">Page 3</SelectItem>
                            <SelectItem value="4">Page 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Position (1-4)</label>
                        <Select value={searchForm.position} onValueChange={(v) => setSearchForm({ ...searchForm, position: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Position 1</SelectItem>
                            <SelectItem value="2">Position 2</SelectItem>
                            <SelectItem value="3">Position 3</SelectItem>
                            <SelectItem value="4">Position 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setSearchDialog(false)} className="flex-1">Cancel</Button>
                      <Button type="submit" className="flex-1">{editingSearch ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
            </div>
            
            <BulkActionToolbar
              selectedCount={selectedSearches.size}
              totalCount={searches.length}
              onSelectAll={handleSelectAllSearches}
              onDelete={handleBulkDeleteSearches}
              onActivate={handleBulkActivateSearches}
              onDeactivate={handleBulkDeactivateSearches}
              isAllSelected={selectedSearches.size === searches.length && searches.length > 0}
              selectedData={searches.filter(s => selectedSearches.has(s.id))}
              allData={searches}
              csvColumns={['id', 'title', 'blog_id', 'position', 'web_result_page']}
              csvFilename="dataorbit_searches"
              linkGenerator={(search) => `${window.location.origin}/dataorbit/wr?id=${(search as RelatedSearch).id}&wr=${(search as RelatedSearch).web_result_page}`}
            />
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium w-12">
                      <Checkbox checked={selectedSearches.size === searches.length && searches.length > 0} onCheckedChange={handleSelectAllSearches} />
                    </th>
                    <th className="text-left p-4 text-sm font-medium">Title</th>
                    <th className="text-left p-4 text-sm font-medium">Blog</th>
                    <th className="text-left p-4 text-sm font-medium">Page</th>
                    <th className="text-left p-4 text-sm font-medium">Position</th>
                    <th className="text-left p-4 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searches.map((search) => (
                    <tr key={search.id} className={`border-t border-border ${selectedSearches.has(search.id) ? 'bg-muted/50' : ''}`}>
                      <td className="p-4">
                        <Checkbox checked={selectedSearches.has(search.id)} onCheckedChange={() => toggleSearchSelection(search.id)} />
                      </td>
                      <td className="p-4 text-sm">{search.title}</td>
                      <td className="p-4 text-sm text-muted-foreground">{search.blogs?.title || '-'}</td>
                      <td className="p-4 text-sm text-muted-foreground">Page {search.web_result_page}</td>
                      <td className="p-4 text-sm text-muted-foreground">{search.position}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSearch(search)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSearch(search.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* WEB RESULTS TAB */}
          <TabsContent value="web-results">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Web Results</h2>
              <Dialog open={webResultDialog} onOpenChange={(open) => { setWebResultDialog(open); if (!open) resetWebResultForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Web Result</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingWebResult ? 'Edit' : 'Add'} Web Result</DialogTitle></DialogHeader>
                  <form onSubmit={handleWebResultSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Related Search *</label>
                      <Select value={webResultForm.related_search_id} onValueChange={(v) => setWebResultForm({ ...webResultForm, related_search_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select related search" /></SelectTrigger>
                        <SelectContent className="z-50">
                          {searches.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.blogs?.title} » {s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Title *</label>
                      <Input value={webResultForm.title} onChange={(e) => setWebResultForm({ ...webResultForm, title: e.target.value })} placeholder="e.g., Best Social Media Platform 2024" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea value={webResultForm.description} onChange={(e) => setWebResultForm({ ...webResultForm, description: e.target.value })} placeholder="Short description..." rows={3} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Logo URL</label>
                      <Input value={webResultForm.logo} onChange={(e) => setWebResultForm({ ...webResultForm, logo: e.target.value })} placeholder="https://example.com/logo.png" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target URL *</label>
                      <Input value={webResultForm.url} onChange={(e) => setWebResultForm({ ...webResultForm, url: e.target.value })} placeholder="https://example.com/page" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name/Domain *</label>
                      <Input value={webResultForm.name} onChange={(e) => setWebResultForm({ ...webResultForm, name: e.target.value })} placeholder="example.com" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Page Number (Auto)</label>
                        <Input value={selectedWebResultSearch ? `Page #${selectedWebResultSearch.web_result_page}` : 'Select search first'} disabled className="bg-muted" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Position *</label>
                        <Input type="number" value={webResultForm.position} onChange={(e) => setWebResultForm({ ...webResultForm, position: e.target.value, forceReplace: false })} min="0" required />
                      </div>
                    </div>
                    
                    {/* Position indicator */}
                    {webResultForm.related_search_id && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">This result will appear at position #{currentPosition}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground mr-2">Positions:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => {
                            const isOccupied = occupiedPositions.some(p => p.position === pos);
                            const isSelected = pos === currentPosition;
                            return (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => setWebResultForm({ ...webResultForm, position: pos.toString(), forceReplace: false })}
                                className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                                  isSelected 
                                    ? 'ring-2 ring-offset-2 ring-primary' 
                                    : ''
                                } ${
                                  isOccupied 
                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {pos}
                              </button>
                            );
                          })}
                        </div>
                        
                        {positionConflict && (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 text-yellow-600">
                              <span className="text-sm">⚠️ Position {currentPosition} is taken by: "{positionConflict.name}"</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id="force_replace" 
                                checked={webResultForm.forceReplace} 
                                onCheckedChange={(c) => setWebResultForm({ ...webResultForm, forceReplace: c === true })} 
                              />
                              <label htmlFor="force_replace" className="text-sm font-medium text-red-600">Force replace existing result</label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Checkbox id="is_sponsored" checked={webResultForm.is_sponsored} onCheckedChange={(c) => setWebResultForm({ ...webResultForm, is_sponsored: c === true })} />
                      <label htmlFor="is_sponsored" className="text-sm font-medium">Sponsored Ad</label>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                      <Button type="button" variant="outline" onClick={() => { setWebResultDialog(false); resetWebResultForm(); }}>Cancel</Button>
                      <Button type="submit">{editingWebResult ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Pre-landing Dialog */}
            <Dialog open={preLandingDialog} onOpenChange={setPreLandingDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Pre-Landing Page Config</DialogTitle></DialogHeader>
                <form onSubmit={handlePreLandingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium">Logo URL</label><Input value={preLandingForm.logo_url} onChange={(e) => setPreLandingForm({ ...preLandingForm, logo_url: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Logo Size (px)</label><Input type="number" value={preLandingForm.logo_size} onChange={(e) => setPreLandingForm({ ...preLandingForm, logo_size: e.target.value })} /></div>
                  </div>
                  <div><label className="text-sm font-medium">Main Image URL</label><Input value={preLandingForm.main_image_url} onChange={(e) => setPreLandingForm({ ...preLandingForm, main_image_url: e.target.value })} /></div>
                  <div><label className="text-sm font-medium">Headline</label><Input value={preLandingForm.headline} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline: e.target.value })} /></div>
                  <div><label className="text-sm font-medium">Description</label><Textarea value={preLandingForm.description} onChange={(e) => setPreLandingForm({ ...preLandingForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-sm font-medium">Headline Size</label><Input type="number" value={preLandingForm.headline_font_size} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline_font_size: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Headline Color</label><Input type="color" value={preLandingForm.headline_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline_color: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Description Color</label><Input type="color" value={preLandingForm.description_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, description_color: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-sm font-medium">Button Text</label><Input value={preLandingForm.button_text} onChange={(e) => setPreLandingForm({ ...preLandingForm, button_text: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Button Color</label><Input type="color" value={preLandingForm.button_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, button_color: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Background</label><Input type="color" value={preLandingForm.background_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, background_color: e.target.value })} /></div>
                  </div>
                  <div><label className="text-sm font-medium">Countdown (seconds)</label><Input type="number" value={preLandingForm.countdown_seconds} onChange={(e) => setPreLandingForm({ ...preLandingForm, countdown_seconds: e.target.value })} min="0" /></div>
                  <Button type="submit" className="w-full">Save Pre-Landing Config</Button>
                </form>
              </DialogContent>
            </Dialog>
            
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
              csvColumns={['id', 'name', 'title', 'url', 'description', 'is_sponsored', 'position']}
              csvFilename="dataorbit_web_results"
              linkGenerator={(result) => {
                const search = searches.find(s => s.id === (result as WebResult).related_search_id);
                return `${window.location.origin}/dataorbit/wr?id=${search?.id}&wr=${search?.web_result_page || 1}`;
              }}
            />
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium w-12">
                      <Checkbox checked={selectedWebResults.size === webResults.length && webResults.length > 0} onCheckedChange={handleSelectAllWebResults} />
                    </th>
                    <th className="text-left p-4 text-sm font-medium">Title</th>
                    <th className="text-left p-4 text-sm font-medium">Domain</th>
                    <th className="text-left p-4 text-sm font-medium">Blog » Search</th>
                    <th className="text-left p-4 text-sm font-medium">Page</th>
                    <th className="text-left p-4 text-sm font-medium">Pos</th>
                    <th className="text-left p-4 text-sm font-medium">Sponsored</th>
                    <th className="text-left p-4 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webResults.map((result) => (
                    <tr key={result.id} className={`border-t border-border ${selectedWebResults.has(result.id) ? 'bg-muted/50' : ''}`}>
                      <td className="p-4">
                        <Checkbox checked={selectedWebResults.has(result.id)} onCheckedChange={() => toggleWebResultSelection(result.id)} />
                      </td>
                      <td className="p-4 text-sm">{result.title}</td>
                      <td className="p-4 text-sm text-muted-foreground">{result.name}</td>
                      <td className="p-4 text-sm text-muted-foreground text-xs">
                        {result.related_searches?.blogs?.title} » {result.related_searches?.title}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">P{result.related_searches?.web_result_page}</td>
                      <td className="p-4 text-sm text-muted-foreground">{result.position}</td>
                      <td className="p-4">
                        {result.is_sponsored && (
                          <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-600">Sponsored</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openPreLanding(result)}><Settings className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditWebResult(result)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteWebResult(result.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* PRE-LANDING TAB */}
          <TabsContent value="pre-landing">
            <h2 className="text-lg font-semibold mb-4">Pre-Landing Page Builder</h2>
            
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h3 className="text-md font-semibold mb-4">Step 1: Select Related Search</h3>
              <Select value={selectedSearch} onValueChange={setSelectedSearch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select related search" />
                </SelectTrigger>
                <SelectContent>
                  {searches.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.blogs?.title} » {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedSearch && (
                <>
                  <h3 className="text-md font-semibold mt-6 mb-4">Step 2: Select Web Result</h3>
                  <Select value={selectedResult} onValueChange={setSelectedResult}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select web result" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredResults.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} - {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {selectedSearchData && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-medium">Selected Path:</span>
                  <span className="text-muted-foreground">{selectedSearchData.blogs?.title}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{selectedSearchData.title}</span>
                  {selectedResultData && (
                    <>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-primary font-medium">{selectedResultData.name}</span>
                      <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">Pre-Landing Page</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {selectedResult && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-md font-semibold mb-4">Edit Pre-Landing Page</h3>
                <form onSubmit={handlePreLandingSubmit} className="space-y-4">
                  <div><label className="text-sm font-medium">Logo URL</label><Input value={preLandingForm.logo_url} onChange={(e) => setPreLandingForm({ ...preLandingForm, logo_url: e.target.value })} placeholder="https://example.com/logo.png" /></div>
                  <div><label className="text-sm font-medium">Main Image URL</label><Input value={preLandingForm.main_image_url} onChange={(e) => setPreLandingForm({ ...preLandingForm, main_image_url: e.target.value })} placeholder="https://example.com/main-image.jpg" /></div>
                  <div><label className="text-sm font-medium">Headline</label><Input value={preLandingForm.headline} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline: e.target.value })} placeholder="Exciting offer!" /></div>
                  <div><label className="text-sm font-medium">Description</label><Textarea value={preLandingForm.description} onChange={(e) => setPreLandingForm({ ...preLandingForm, description: e.target.value })} placeholder="Describe what users will get..." /></div>
                  <div><label className="text-sm font-medium">CTA Button Text</label><Input value={preLandingForm.button_text} onChange={(e) => setPreLandingForm({ ...preLandingForm, button_text: e.target.value })} /></div>
                  <div>
                    <label className="text-sm font-medium">Background Color</label>
                    <div className="flex gap-2">
                      <Input type="color" value={preLandingForm.background_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, background_color: e.target.value })} className="w-20" />
                      <Input value={preLandingForm.background_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, background_color: e.target.value })} />
                    </div>
                  </div>
                  <div><label className="text-sm font-medium">Background Image URL</label><Input value={preLandingForm.background_image} onChange={(e) => setPreLandingForm({ ...preLandingForm, background_image: e.target.value })} placeholder="https://example.com/background.jpg" /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-sm font-medium">Headline Color</label><Input type="color" value={preLandingForm.headline_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline_color: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Description Color</label><Input type="color" value={preLandingForm.description_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, description_color: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Button Color</label><Input type="color" value={preLandingForm.button_color} onChange={(e) => setPreLandingForm({ ...preLandingForm, button_color: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium">Countdown Seconds</label><Input type="number" value={preLandingForm.countdown_seconds} onChange={(e) => setPreLandingForm({ ...preLandingForm, countdown_seconds: e.target.value })} min="0" /></div>
                    <div><label className="text-sm font-medium">Headline Font Size</label><Input type="number" value={preLandingForm.headline_font_size} onChange={(e) => setPreLandingForm({ ...preLandingForm, headline_font_size: e.target.value })} /></div>
                  </div>
                  <Button type="submit" className="w-full">Update Pre-Landing Page</Button>
                </form>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
