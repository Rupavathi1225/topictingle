import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tejaStarinClient } from "@/integrations/tejastarin/client";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { useTracking } from "@/hooks/useTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Cloud, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PreLandingEditor } from "@/components/admin/PreLandingEditor";
import { EmailCaptureViewer } from "@/components/admin/EmailCaptureViewer";
import { RelatedSearchManager } from "@/components/admin/RelatedSearchManager";
import { WebResultsManager } from "@/components/admin/WebResultsManager";
import { TejaStarinBlogs } from "@/components/admin/TejaStarinBlogs";
import { TejaStarinWebResults } from "@/components/admin/TejaStarinWebResults";
import { TejaStarinRelatedSearches } from "@/components/admin/TejaStarinRelatedSearches";
import { TejaStarinPreLanding } from "@/components/admin/TejaStarinPreLanding";
import { TejaStarinEmailCaptures } from "@/components/admin/TejaStarinEmailCaptures";
import { DataOrbitZoneManager } from "@/components/admin/DataOrbitZoneManager";
import { FastMoneyManager } from "@/components/admin/FastMoneyManager";
import { OfferGrabZoneManager } from "@/components/admin/OfferGrabZoneManager";
import { MingleMoodyManager } from "@/components/admin/MingleMoodyManager";

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
  category_id: number;
  author: string;
  content: string;
  featured_image: string | null;
  status: string;
  published_at: string;
  serial_number: number;
  author_bio?: string;
  author_image?: string;
  created_at?: string;
}

interface RelatedSearch {
  id: string;
  category_id?: number;
  blog_id?: string;
  search_text: string;
  target_url?: string;
  display_order: number;
  is_active?: boolean;
  allowed_countries?: string[];
  session_id?: string;
  ip_address?: string;
}

interface PrelandingPage {
  id: string;
  related_search_id: string;
  logo_url: string | null;
  logo_position: string;
  logo_size: number;
  main_image_url: string | null;
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
  background_image_url: string | null;
}

interface AnalyticsDetail {
  session_id: string;
  ip_address: string;
  country: string;
  source: string;
  user_agent: string;
  page_views_count: number;
  clicks_count: number;
  related_searches_count: number;
  related_searches_breakdown: Array<{search_term: string; click_count: number; unique_clicks: number; visit_now_clicks: number; visit_now_unique: number}>;
  blog_clicks_breakdown: Array<{blog_title: string; click_count: number; unique_clicks: number}>;
  last_active: string;
}

interface Analytics {
  sessions: number;
  page_views: number;
  clicks: number;
  unique_pages?: number;
  unique_clicks?: number;
}

type Website = 'topicmingle' | 'tejastarin' | 'fastmoney' | 'offergrabzone' | 'minglemoody';
type Section = 'blogs' | 'searches' | 'webresults' | 'prelanding' | 'emails' | 'landing';

const Admin = () => {
  const { sessionId } = useTracking();
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);

  // TejaStarin state
  const [tsBlogs, setTsBlogs] = useState<any[]>([]);
  const [tsWebResults, setTsWebResults] = useState<any[]>([]);
  const [tsLandingPages, setTsLandingPages] = useState<any[]>([]);
  const [tsRelatedSearches, setTsRelatedSearches] = useState<any[]>([]);
  
  const [analytics, setAnalytics] = useState<Analytics>({ sessions: 0, page_views: 0, clicks: 0 });
  
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [expandedWebsite, setExpandedWebsite] = useState<Website | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category_id: "",
    author: "",
    content: "",
    featured_image: "",
    status: "draft",
  });

  const [searchFormData, setSearchFormData] = useState({
    category_id: "",
    search_text: "",
    display_order: 0,
    is_active: true,
    allowed_countries: ["WW"] as string[],
  });

  const [analyticsDetails, setAnalyticsDetails] = useState<AnalyticsDetail[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  // Website configurations
  const websites = [
    {
      id: 'topicmingle' as Website,
      name: 'TopicMingle',
      description: 'Content Management & Analytics',
      color: 'bg-blue-500',
      icon: '📝'
    },
    {
      id: 'tejastarin' as Website,
      name: 'DataCreditZone',
      description: 'Blog & Web Results Platform',
      color: 'bg-orange-500',
      icon: '📄'
    },
    {
      id: 'fastmoney' as Website,
      name: 'FastMoney',
      description: 'Money Earning Platform',
      color: 'bg-yellow-500',
      icon: '💰'
    },
    {
      id: 'offergrabzone' as Website,
      name: 'OfferGrabZone',
      description: 'Offers & Deals Platform',
      color: 'bg-cyan-500',
      icon: '🎁'
    },
    {
      id: 'minglemoody' as Website,
      name: 'MingleMoody',
      description: 'Social Connection Platform',
      color: 'bg-cyan-600',
      icon: '💬'
    }
  ];

  const sections: Record<Website, { id: Section; name: string; description: string }[]> = {
    topicmingle: [
      { id: 'blogs', name: 'Blogs', description: 'Manage blog posts and content' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Pre-Landing Pages', description: 'Edit pre-landing page designs' },
      { id: 'emails', name: 'Email Captures', description: 'View captured email addresses' }
    ],
    tejastarin: [
      { id: 'blogs', name: 'Blogs', description: 'Manage blog posts and content' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Pre-Landing Pages', description: 'Edit pre-landing page designs' },
      { id: 'emails', name: 'Email Captures', description: 'View captured email addresses' }
    ],
    fastmoney: [
      { id: 'landing', name: 'Landing', description: 'Manage landing page settings' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Prelanders', description: 'Edit prelander page designs' }
    ],
    offergrabzone: [
      { id: 'landing', name: 'Landing Content', description: 'Manage landing page content' },
      { id: 'searches', name: 'Search Buttons', description: 'Manage related search buttons' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Pre-Landings', description: 'Edit pre-landing page designs' }
    ],
    minglemoody: [
      { id: 'landing', name: 'Landing Content', description: 'Manage landing page content' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Prelandings', description: 'Edit prelanding page designs' }
    ]
  };

  // Get IP address for tracking
  const getIPAddress = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Fetch TejaStarin content
  const fetchTsBlogs = async () => {
    const { data } = await tejaStarinClient.from('blogs').select('*').order('created_at', { ascending: false });
    if (data) setTsBlogs(data);
  };

  const fetchTsWebResults = async () => {
    const { data } = await tejaStarinClient.from('web_results').select('*').order('order_index');
    if (data) setTsWebResults(data);
  };

  const fetchTsLandingPages = async () => {
    const { data } = await tejaStarinClient.from('pre_landing_config').select('*').order('created_at', { ascending: false });
    if (data) setTsLandingPages(data);
  };

  const fetchTsRelatedSearches = async () => {
    const { data } = await tejaStarinClient.from('related_searches').select('*').order('order_index');
    if (data) setTsRelatedSearches(data);
  };

  useEffect(() => {
    fetchCategories();
    fetchBlogs();
    fetchRelatedSearches();
    fetchAnalytics();
    fetchTsBlogs();
    fetchTsWebResults();
    fetchTsLandingPages();
    fetchTsRelatedSearches();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("id");
    if (data) setCategories(data as Category[]);
  };

  const fetchBlogs = async () => {
    const { data } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBlogs(data as Blog[]);
  };

  const fetchRelatedSearches = async () => {
    const { data } = await supabase
      .from("related_searches")
      .select("*")
      .order("category_id", { ascending: true })
      .order("display_order", { ascending: true });
    if (data) setRelatedSearches(data as RelatedSearch[]);
  };

  const fetchAnalytics = async () => {
    const { count: sessionsCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true });
    
    const { count: pageViewsCount } = await supabase
      .from("page_views")
      .select("*", { count: "exact", head: true });
    
    const { count: clicksCount } = await supabase
      .from("clicks")
      .select("*", { count: "exact", head: true });

    setAnalytics({
      sessions: sessionsCount || 0,
      page_views: pageViewsCount || 0,
      clicks: clicksCount || 0,
    });

    // Fetch detailed analytics
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("*")
      .order("last_active", { ascending: false });

    if (sessionsData) {
      const details = await Promise.all(
        sessionsData.map(async (session) => {
          const { count: pvCount } = await supabase
            .from("page_views")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.session_id);

          const { count: cCount } = await supabase
            .from("clicks")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.session_id);

          const { count: rsCount } = await supabase
            .from("clicks")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.session_id)
            .like("button_id", "related-search-%");

          // Get breakdown of each related search with session_id to get IP
          const { data: rsBreakdown } = await supabase
            .from("clicks")
            .select("button_label, session_id")
            .eq("session_id", session.session_id)
            .like("button_id", "related-search-%");

          // Count clicks and unique IPs per search term
          const breakdownMap = new Map<string, {clicks: number; ips: Set<string>; visitNowClicks: number; visitNowIps: Set<string>}>();
          
          for (const click of rsBreakdown || []) {
            const term = click.button_label || 'Unknown';
            
            // Get IP for this session_id
            const { data: sessionData } = await supabase
              .from("sessions")
              .select("ip_address")
              .eq("session_id", click.session_id)
              .single();
            
            const ip = sessionData?.ip_address || 'unknown';
            
            if (!breakdownMap.has(term)) {
              breakdownMap.set(term, {clicks: 0, ips: new Set(), visitNowClicks: 0, visitNowIps: new Set()});
            }
            const entry = breakdownMap.get(term)!;
            entry.clicks += 1;
            entry.ips.add(ip);
          }

          // Get Visit Now button clicks for each related search
          for (const [term, data] of breakdownMap.entries()) {
            const { data: visitNowClicks } = await supabase
              .from("clicks")
              .select("session_id")
              .eq("button_id", `visit-now-${term}`)
              .eq("session_id", session.session_id);

            for (const click of visitNowClicks || []) {
              const { data: sessionData } = await supabase
                .from("sessions")
                .select("ip_address")
                .eq("session_id", click.session_id)
                .single();
              
              const ip = sessionData?.ip_address || 'unknown';
              data.visitNowClicks += 1;
              data.visitNowIps.add(ip);
            }
          }
          
          const breakdown = Array.from(breakdownMap.entries()).map(([search_term, data]) => ({
            search_term,
            click_count: data.clicks,
            unique_clicks: data.ips.size,
            visit_now_clicks: data.visitNowClicks,
            visit_now_unique: data.visitNowIps.size
          }));

          // Get blog clicks breakdown
          const { data: blogClicksData } = await supabase
            .from("clicks")
            .select("button_label, session_id")
            .eq("session_id", session.session_id)
            .like("button_id", "blog-card-%");

          const blogBreakdownMap = new Map<string, {clicks: number; ips: Set<string>}>();
          
          for (const click of blogClicksData || []) {
            const blogTitle = click.button_label || 'Unknown';
            
            const { data: sessionData } = await supabase
              .from("sessions")
              .select("ip_address")
              .eq("session_id", click.session_id)
              .single();
            
            const ip = sessionData?.ip_address || 'unknown';
            
            if (!blogBreakdownMap.has(blogTitle)) {
              blogBreakdownMap.set(blogTitle, {clicks: 0, ips: new Set()});
            }
            const entry = blogBreakdownMap.get(blogTitle)!;
            entry.clicks += 1;
            entry.ips.add(ip);
          }

          const blogBreakdown = Array.from(blogBreakdownMap.entries()).map(([blog_title, data]) => ({
            blog_title,
            click_count: data.clicks,
            unique_clicks: data.ips.size
          }));

          return {
            session_id: session.session_id,
            ip_address: session.ip_address || 'unknown',
            country: session.country || 'WW',
            source: session.source || 'direct',
            user_agent: session.user_agent || 'unknown',
            page_views_count: pvCount || 0,
            clicks_count: cCount || 0,
            related_searches_count: rsCount || 0,
            related_searches_breakdown: breakdown,
            blog_clicks_breakdown: blogBreakdown,
            last_active: session.last_active,
          };
        })
      );
      setAnalyticsDetails(details);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.category_id || !formData.author || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    const blogData = {
      title: formData.title,
      slug: formData.slug,
      category_id: parseInt(formData.category_id),
      author: formData.author,
      content: formData.content,
      featured_image: formData.featured_image || null,
      status: formData.status,
    };

    if (editingBlog) {
      const { error } = await supabase
        .from("blogs")
        .update(blogData)
        .eq("id", editingBlog.id);

      if (error) {
        toast.error("Failed to update blog");
      } else {
        toast.success("Blog updated successfully");
        fetchBlogs();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("blogs").insert([blogData]);

      if (error) {
        toast.error("Failed to create blog");
      } else {
        toast.success("Blog created successfully");
        fetchBlogs();
        resetForm();
      }
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      category_id: blog.category_id.toString(),
      author: blog.author,
      content: blog.content,
      featured_image: blog.featured_image || "",
      status: blog.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this blog?")) {
      const { error } = await supabase.from("blogs").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete blog");
      } else {
        toast.success("Blog deleted successfully");
        fetchBlogs();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      category_id: "",
      author: "",
      content: "",
      featured_image: "",
      status: "draft",
    });
    setEditingBlog(null);
    setIsDialogOpen(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchFormData.category_id || !searchFormData.search_text) {
      toast.error("Please fill in all required fields");
      return;
    }

    const ipAddress = await getIPAddress();

    const searchData = {
      category_id: parseInt(searchFormData.category_id),
      search_text: searchFormData.search_text,
      display_order: searchFormData.display_order,
      is_active: searchFormData.is_active,
      allowed_countries: searchFormData.allowed_countries,
      session_id: sessionId,
      ip_address: ipAddress,
    };

    if (editingSearch) {
      const { error } = await supabase
        .from("related_searches")
        .update(searchData)
        .eq("id", editingSearch.id);

      if (error) {
        toast.error("Failed to update search");
      } else {
        toast.success("Search updated successfully");
        fetchRelatedSearches();
        resetSearchForm();
      }
    } else {
      const { error } = await supabase.from("related_searches").insert([searchData]);

      if (error) {
        toast.error("Failed to create search");
      } else {
        toast.success("Search created successfully");
        fetchRelatedSearches();
        resetSearchForm();
      }
    }
  };

  const handleEditSearch = (search: RelatedSearch) => {
    setEditingSearch(search);
    setSearchFormData({
      category_id: search.category_id?.toString() || "",
      search_text: search.search_text,
      display_order: search.display_order,
      is_active: search.is_active || true,
      allowed_countries: search.allowed_countries || ["WW"],
    });
    setIsSearchDialogOpen(true);
  };

  const handleDeleteSearch = async (id: string) => {
    if (confirm("Are you sure you want to delete this related search?")) {
      const { error } = await supabase.from("related_searches").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete search");
      } else {
        toast.success("Search deleted successfully");
        fetchRelatedSearches();
      }
    }
  };

  const resetSearchForm = () => {
    setSearchFormData({
      category_id: "",
      search_text: "",
      display_order: 0,
      is_active: true,
      allowed_countries: ["WW"],
    });
    setEditingSearch(null);
    setIsSearchDialogOpen(false);
  };

  const handleWebsiteSelect = (website: Website) => {
    if (selectedWebsite === website) {
      setSelectedWebsite(null);
      setSelectedSection(null);
      setExpandedWebsite(null);
    } else {
      setSelectedWebsite(website);
      setSelectedSection(null);
      setExpandedWebsite(website);
    }
  };

  const handleSectionSelect = (section: Section) => {
    setSelectedSection(section);
  };

  const getProjectClient = (website: Website) => {
    switch (website) {
      case 'topicmingle': return supabase;
      case 'tejastarin': return tejaStarinClient;
      default: return supabase;
    }
  };

  const getProjectName = (website: Website) => {
    switch (website) {
      case 'topicmingle': return 'TopicMingle';
      case 'tejastarin': return 'DataCreditZone';
      case 'fastmoney': return 'FastMoney';
      case 'offergrabzone': return 'OfferGrabZone';
      case 'minglemoody': return 'MingleMoody';
      default: return 'TopicMingle';
    }
  };

  // Render content based on selected website and section
  const renderContent = () => {
    if (!selectedWebsite || !selectedSection) return null;

    const client = getProjectClient(selectedWebsite);
    const projectName = getProjectName(selectedWebsite);

    switch (selectedSection) {
      case 'blogs':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinBlogs />;
        }
        return (
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{projectName} Blogs</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Blog
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBlog ? "Edit Blog" : "Create New Blog"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category_id: value })
                        }
                      >
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
                      <Label htmlFor="author">Author *</Label>
                      <Input
                        id="author"
                        value={formData.author}
                        onChange={(e) =>
                          setFormData({ ...formData, author: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="featured_image">Featured Image URL</Label>
                      <Input
                        id="featured_image"
                        value={formData.featured_image}
                        onChange={(e) =>
                          setFormData({ ...formData, featured_image: e.target.value })
                        }
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) =>
                          setFormData({ ...formData, content: e.target.value })
                        }
                        rows={10}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingBlog ? "Update Blog" : "Create Blog"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold">Serial #</th>
                    <th className="text-left p-4 font-semibold">Title</th>
                    <th className="text-left p-4 font-semibold">Author</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((blog) => (
                    <tr key={blog.id} className="border-b last:border-0">
                      <td className="p-4">
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-bold rounded">
                          #{blog.serial_number}
                        </span>
                      </td>
                      <td className="p-4">{blog.title}</td>
                      <td className="p-4">{blog.author}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            blog.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {blog.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(blog)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(blog.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'searches':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinRelatedSearches />;
        }
        if (selectedWebsite === 'fastmoney') {
          return <FastMoneyManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'offergrabzone') {
          return <OfferGrabZoneManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'minglemoody') {
          return <MingleMoodyManager initialTab={selectedSection} />;
        }
        return <RelatedSearchManager projectClient={client} projectName={projectName} />;

      case 'webresults':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinWebResults />;
        }
        if (selectedWebsite === 'fastmoney') {
          return <FastMoneyManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'offergrabzone') {
          return <OfferGrabZoneManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'minglemoody') {
          return <MingleMoodyManager initialTab={selectedSection} />;
        }
        return <WebResultsManager projectClient={client} projectName={projectName} />;

      case 'prelanding':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinPreLanding />;
        }
        if (selectedWebsite === 'fastmoney') {
          return <FastMoneyManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'offergrabzone') {
          return <OfferGrabZoneManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'minglemoody') {
          return <MingleMoodyManager initialTab={selectedSection} />;
        }
        return <PreLandingEditor projectClient={client} projectName={projectName} />;

      case 'emails':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinEmailCaptures />;
        }
        return <EmailCaptureViewer projectClient={client} />;

      case 'landing':
        if (selectedWebsite === 'fastmoney') {
          return <FastMoneyManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'offergrabzone') {
          return <OfferGrabZoneManager initialTab={selectedSection} />;
        }
        if (selectedWebsite === 'minglemoody') {
          return <MingleMoodyManager initialTab={selectedSection} />;
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Multi-Site Admin Panel</h1>
            <p className="text-muted-foreground mt-2">Manage all your websites from one place</p>
          </div>
          
          {selectedWebsite && selectedSection && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Managing: <span className="font-semibold text-foreground">{getProjectName(selectedWebsite)}</span> / <span className="font-semibold text-foreground capitalize">{selectedSection}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedSection(null);
                  setExpandedWebsite(selectedWebsite);
                }}
              >
                Change Section
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedWebsite(null);
                  setSelectedSection(null);
                  setExpandedWebsite(null);
                }}
              >
                Change Website
              </Button>
            </div>
          )}
        </div>

        {/* Website Selection Cards */}
        {!selectedWebsite && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {websites.map((website) => (
              <Card 
                key={website.id}
                className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${
                  selectedWebsite === website.id 
                    ? 'border-primary shadow-lg' 
                    : 'border-border'
                }`}
                onClick={() => handleWebsiteSelect(website.id)}
              >
                <CardHeader className={`${website.color} text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{website.name}</CardTitle>
                    <span className="text-2xl">{website.icon}</span>
                  </div>
                  <CardDescription className="text-white/90">
                    {website.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Click to manage
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Section Selection */}
        {selectedWebsite && !selectedSection && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedWebsite(null);
                  setSelectedSection(null);
                  setExpandedWebsite(null);
                }}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to Websites
              </Button>
              <h2 className="text-2xl font-bold">
                Select Section for {getProjectName(selectedWebsite)}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections[selectedWebsite].map((section) => (
                <Card 
                  key={section.id}
                  className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 border-border"
                  onClick={() => handleSectionSelect(section.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{section.name}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary font-medium">
                        Open Section
                      </span>
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        {selectedWebsite && selectedSection && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setSelectedSection(null)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back to Sections
                </Button>
                <h2 className="text-2xl font-bold">
                  {getProjectName(selectedWebsite)} - {sections[selectedWebsite].find(s => s.id === selectedSection)?.name}
                </h2>
              </div>
              
              {/* Next Section Navigation */}
              <div className="flex items-center gap-2">
                {(() => {
                  const currentSections = sections[selectedWebsite];
                  const currentIndex = currentSections.findIndex(s => s.id === selectedSection);
                  const prevSection = currentIndex > 0 ? currentSections[currentIndex - 1] : null;
                  const nextSection = currentIndex < currentSections.length - 1 ? currentSections[currentIndex + 1] : null;
                  
                  return (
                    <>
                      {prevSection && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSection(prevSection.id)}
                          className="flex items-center gap-2"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          {prevSection.name}
                        </Button>
                      )}
                      {nextSection && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSection(nextSection.id)}
                          className="flex items-center gap-2"
                        >
                          {nextSection.name}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;