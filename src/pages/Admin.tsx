import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dataOrbitZoneClient } from "@/integrations/dataorbitzone/client";
import { searchProjectClient } from "@/integrations/searchproject/client";
import { tejaStarinClient } from "@/integrations/tejastarin/client";
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

type Website = 'topicmingle' | 'dataorbitzone' | 'searchproject' | 'tejastarin';
type Section = 'blogs' | 'searches' | 'analytics' | 'webresults' | 'prelanding' | 'emails' | 'landing';

const Admin = () => {
  const { sessionId } = useTracking();
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  
  // DataOrbitZone state
  const [dzCategories, setDzCategories] = useState<Category[]>([]);
  const [dzBlogs, setDzBlogs] = useState<Blog[]>([]);
  const [dzRelatedSearches, setDzRelatedSearches] = useState<RelatedSearch[]>([]);
  const [dzPrelandingPages, setDzPrelandingPages] = useState<PrelandingPage[]>([]);
  const [dzBlogDialog, setDzBlogDialog] = useState(false);
  const [editingDzBlog, setEditingDzBlog] = useState<Blog | null>(null);
  const [dzSearchDialog, setDzSearchDialog] = useState(false);
  const [editingDzSearch, setEditingDzSearch] = useState<RelatedSearch | null>(null);
  
  // SearchProject state
  const [spWebResults, setSpWebResults] = useState<any[]>([]);
  const [spLandingPages, setSpLandingPages] = useState<any[]>([]);
  const [spRelatedSearches, setSpRelatedSearches] = useState<any[]>([]);
  const [spWebResultDialog, setSpWebResultDialog] = useState(false);
  const [editingSpWebResult, setEditingSpWebResult] = useState<any>(null);
  const [spLandingDialog, setSpLandingDialog] = useState(false);
  const [editingSpLanding, setEditingSpLanding] = useState<any>(null);
  const [showSpLandingForm, setShowSpLandingForm] = useState(false);
  const [spLandingFormData, setSpLandingFormData] = useState({
    title: '',
    description: '',
  });

  // TejaStarin state
  const [tsBlogs, setTsBlogs] = useState<any[]>([]);
  const [tsWebResults, setTsWebResults] = useState<any[]>([]);
  const [tsLandingPages, setTsLandingPages] = useState<any[]>([]);
  const [tsRelatedSearches, setTsRelatedSearches] = useState<any[]>([]);
  
  const [analytics, setAnalytics] = useState<Analytics>({ sessions: 0, page_views: 0, clicks: 0 });
  const [dataOrbitAnalytics, setDataOrbitAnalytics] = useState<Analytics>({ sessions: 0, page_views: 0, clicks: 0 });
  const [searchProjectAnalytics, setSearchProjectAnalytics] = useState<any[]>([]);
  
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

  const [dzFormData, setDzFormData] = useState({
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
  const [dataOrbitAnalyticsDetails, setDataOrbitAnalyticsDetails] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [dataOrbitSelectedCountry, setDataOrbitSelectedCountry] = useState<string>("all");
  const [dataOrbitSelectedSiteName, setDataOrbitSelectedSiteName] = useState<string>("all");

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
      id: 'dataorbitzone' as Website,
      name: 'DataOrbitZone',
      description: 'Data Analytics Platform',
      color: 'bg-green-500',
      icon: '🌐'
    },
    {
      id: 'searchproject' as Website,
      name: 'SearchProject',
      description: 'Search Engine & Results',
      color: 'bg-purple-500',
      icon: '🔍'
    },
    {
      id: 'tejastarin' as Website,
      name: 'Teja Starin',
      description: 'Blog & Web Results Platform',
      color: 'bg-orange-500',
      icon: '📄'
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
    dataorbitzone: [
      { id: 'blogs', name: 'Blogs', description: 'Manage blog posts and content' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'prelanding', name: 'Pre-Landing Pages', description: 'Edit pre-landing page designs' },
      { id: 'emails', name: 'Email Captures', description: 'View captured email addresses' }
    ],
    searchproject: [
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'landing', name: 'Landing Pages', description: 'Manage landing pages' },
      { id: 'prelanding', name: 'Pre-Landing Pages', description: 'Edit pre-landing page designs' },
      { id: 'emails', name: 'Email Captures', description: 'View captured email addresses' }
    ],
    tejastarin: [
      { id: 'blogs', name: 'Blogs', description: 'Manage blog posts and content' },
      { id: 'webresults', name: 'Web Results', description: 'Manage web search results' },
      { id: 'searches', name: 'Related Searches', description: 'Manage related search terms' },
      { id: 'prelanding', name: 'Pre-Landing Pages', description: 'Edit pre-landing page designs' },
      { id: 'emails', name: 'Email Captures', description: 'View captured email addresses' }
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

  // Fetch DataOrbitZone content
  const fetchDzBlogs = async () => {
    const { data } = await dataOrbitZoneClient.from('blogs').select('*').order('created_at', { ascending: false });
    if (data) setDzBlogs(data);
  };

  const fetchDzRelatedSearches = async () => {
    const { data } = await dataOrbitZoneClient.from('related_searches').select('*').order('display_order');
    if (data) setDzRelatedSearches(data);
  };

  // Fetch SearchProject content
  const fetchSpWebResults = async () => {
    const { data } = await searchProjectClient.from('web_results').select('*').order('serial_number');
    if (data) setSpWebResults(data);
  };

  const fetchSpLandingPages = async () => {
    const { data } = await searchProjectClient.from('pre_landing_pages').select('*').order('created_at', { ascending: false });
    if (data) setSpLandingPages(data);
  };

  const fetchSpRelatedSearches = async () => {
    const { data } = await searchProjectClient.from('related_searches').select('*').order('display_order');
    if (data) setSpRelatedSearches(data);
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
    fetchDataOrbitAnalytics();
    fetchSearchProjectAnalytics();
    fetchDzBlogs();
    fetchDzRelatedSearches();
    fetchSpWebResults();
    fetchSpLandingPages();
    fetchSpRelatedSearches();
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

  const handleDzTitleChange = (title: string) => {
    setDzFormData({
      ...dzFormData,
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

  const handleDzBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dzFormData.title || !dzFormData.category_id || !dzFormData.author || !dzFormData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    const blogData = {
      title: dzFormData.title,
      slug: dzFormData.slug,
      category_id: parseInt(dzFormData.category_id),
      author: dzFormData.author,
      content: dzFormData.content,
      featured_image: dzFormData.featured_image || null,
      status: dzFormData.status,
    };

    try {
      if (editingDzBlog) {
        const { error } = await dataOrbitZoneClient
          .from("blogs")
          .update(blogData)
          .eq("id", editingDzBlog.id);

        if (error) {
          toast.error("Failed to update blog");
        } else {
          toast.success("Blog updated successfully");
          fetchDzBlogs();
          resetDzForm();
        }
      } else {
        const { error } = await dataOrbitZoneClient.from("blogs").insert([blogData]);

        if (error) {
          toast.error("Failed to create blog");
        } else {
          toast.success("Blog created successfully");
          fetchDzBlogs();
          resetDzForm();
        }
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error("Failed to save blog");
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

  const handleEditDzBlog = (blog: Blog) => {
    setEditingDzBlog(blog);
    setDzFormData({
      title: blog.title,
      slug: blog.slug,
      category_id: blog.category_id.toString(),
      author: blog.author,
      content: blog.content,
      featured_image: blog.featured_image || "",
      status: blog.status,
    });
    setDzBlogDialog(true);
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

  const resetDzForm = () => {
    setDzFormData({
      title: "",
      slug: "",
      category_id: "",
      author: "",
      content: "",
      featured_image: "",
      status: "draft",
    });
    setEditingDzBlog(null);
    setDzBlogDialog(false);
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

  // DataOrbitZone CRUD handlers
  const handleDeleteDzBlog = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      const { error } = await dataOrbitZoneClient.from('blogs').delete().eq('id', id);
      if (error) {
        toast.error('Failed to delete blog');
      } else {
        toast.success('Blog deleted successfully');
        fetchDzBlogs();
      }
    }
  };

  const handleDeleteDzSearch = async (id: string) => {
    if (confirm('Are you sure you want to delete this related search?')) {
      const { error } = await dataOrbitZoneClient.from('related_searches').delete().eq('id', id);
      if (error) {
        toast.error('Failed to delete related search');
      } else {
        toast.success('Related search deleted successfully');
        fetchDzRelatedSearches();
      }
    }
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

  const fetchDataOrbitAnalytics = async () => {
    try {
      console.log('🔍 Fetching DataOrbitZone analytics...');
      
      // Fetch all analytics data
      const { data: analyticsData, error } = await dataOrbitZoneClient
        .from("analytics")
        .select("*")
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ DataOrbitZone fetch error:', error);
        toast.error('Failed to fetch DataOrbitZone analytics. Check RLS policies.');
        return;
      }

      console.log(`✅ Fetched ${analyticsData?.length || 0} analytics records`);

      if (analyticsData && analyticsData.length > 0) {
        // Log all unique event types for debugging
        const eventTypes = new Set(analyticsData.map((a: any) => a.event_type));
        console.log('📊 Event types found:', Array.from(eventTypes));

        // Log sample events with ALL fields to debug
        console.log('📝 Sample events (full data):', analyticsData.slice(0, 2));
        console.log('📝 Sample events (filtered):', analyticsData.slice(0, 3).map(e => ({
          event_type: e.event_type,
          ip_address: e.ip_address,
          country: e.country,
          site_name: e.site_name,
          page_url: e.page_url,
          url: e.url,
          referrer: e.referrer,
          device: e.device,
          source: e.source
        })));

        // More flexible event type matchers - match ANY event type containing these keywords
        const isPageViewEvent = (eventType?: string) => {
          if (!eventType) return false;
          const lower = eventType.toLowerCase().trim();
          // Match: page_view, pageview, page-view, view, page, etc.
          return lower.includes('page') || 
                 lower.includes('view') || 
                 lower === 'page_view' || 
                 lower === 'pageview';
        };

        const isClickEvent = (eventType?: string) => {
          if (!eventType) return false;
          const lower = eventType.toLowerCase().trim();
          return lower.includes('click');
        };

        // Count events
        const pageViewEvents = analyticsData.filter((a: any) => isPageViewEvent(a.event_type));
        const clickEvents = analyticsData.filter((a: any) => isClickEvent(a.event_type));
        
        console.log('📈 Page view events:', pageViewEvents.length);
        console.log('🖱️  Click events:', clickEvents.length);

        const sessions = new Set(analyticsData.map((a: any) => a.session_id)).size;
        const pageViews = pageViewEvents.length;
        const clicks = clickEvents.length;

        // Calculate UNIQUE pages
        const uniquePages = new Set(
          pageViewEvents
            .map((e: any) => e.page_url)
            .filter((url: any) => url && url.trim() !== "")
        ).size;

        // Calculate UNIQUE clicks
        const uniqueClicks = new Set(
          clickEvents
            .map((e: any) => e.button_id)
            .filter((id: any) => id && id.trim() !== "")
        ).size;

        console.log('📊 Final totals:', { sessions, pageViews, clicks, uniquePages, uniqueClicks });

        setDataOrbitAnalytics({
          sessions,
          page_views: pageViews,
          unique_pages: uniquePages,
          clicks,
          unique_clicks: uniqueClicks
        });

        // Build lookup maps for names
        const relatedSearchIds = Array.from(new Set(
          analyticsData.filter((e: any) => !!e.related_search_id).map((e: any) => e.related_search_id)
        ));
        const blogIds = Array.from(new Set(
          analyticsData.filter((e: any) => !!e.blog_id).map((e: any) => e.blog_id)
        ));

        const relatedSearchMap = new Map<string, string>();
        if (relatedSearchIds.length > 0) {
          const { data: rsData } = await dataOrbitZoneClient
            .from('related_searches')
            .select('id, search_text')
            .in('id', relatedSearchIds);
          rsData?.forEach((r: any) => relatedSearchMap.set(r.id, r.search_text));
        }

        const blogMap = new Map<string, string>();
        if (blogIds.length > 0) {
          const { data: bData } = await dataOrbitZoneClient
            .from('blogs')
            .select('id, title')
            .in('id', blogIds);
          bData?.forEach((b: any) => blogMap.set(b.id, b.title));
        }

        // Helper function to extract domain from URL - now checks multiple URL fields
        const extractSiteName = (event: any) => {
          // Try multiple possible URL field names
          const urlFields = [event.page_url, event.url, event.referrer];
          
          for (const urlField of urlFields) {
            if (!urlField || typeof urlField !== 'string') continue;
            
            try {
              // If it's already a full URL
              if (urlField.startsWith('http://') || urlField.startsWith('https://')) {
                const urlObj = new URL(urlField);
                const hostname = urlObj.hostname.replace(/^www\./, '');
                if (hostname && hostname !== '') return hostname;
              }
              // If it's just a domain
              else if (urlField.includes('.')) {
                const cleaned = urlField.replace(/^www\./, '').split('/')[0];
                if (cleaned && cleaned !== '') return cleaned;
              }
            } catch (error) {
              console.log('Error parsing URL:', urlField, error);
            }
          }
          
          return null;
        };

        // Group by session with enrichment and breakdowns
        const sessionMap = new Map<string, any>();
        analyticsData.forEach((event: any) => {
          if (!sessionMap.has(event.session_id)) {
            // Extract site name from multiple possible sources
            let siteName = 'Unknown';
            
            // First try the site_name field
            if (event.site_name && event.site_name.trim() !== '' && event.site_name !== 'Unknown') {
              siteName = event.site_name;
            } else {
              // Try extracting from URLs
              const extracted = extractSiteName(event);
              if (extracted) {
                siteName = extracted;
              }
            }
            
            console.log(`Session ${event.session_id.slice(0, 8)}: site_name="${event.site_name}" -> resolved to "${siteName}"`);
            
            // Initialize with first event's data - use actual values, not defaults
            sessionMap.set(event.session_id, {
              session_id: event.session_id,
              ip_address: event.ip_address || 'unknown',
              country: event.country || 'unknown',
              site_name: siteName,
              device: event.device || 'unknown',
              source: event.source || 'direct',
              page_views: 0,
              clicks: 0,
              created_at: event.created_at,
              last_active: event.created_at,
              related_search_clicks: new Map<string, { clicks: number; uniques: Set<string> }>(),
              blog_clicks: new Map<string, { clicks: number; uniques: Set<string> }>(),
            });
          }
          const session = sessionMap.get(event.session_id);

          // Enrich with ANY non-null/non-empty values from subsequent events
          if (event.ip_address && event.ip_address.trim() !== '' && event.ip_address !== 'unknown') {
            session.ip_address = event.ip_address;
          }
          if (event.country && event.country.trim() !== '' && event.country !== 'unknown') {
            session.country = event.country;
          }
          // For site_name, try multiple sources
          if (event.site_name && event.site_name.trim() !== '' && event.site_name !== 'Unknown') {
            session.site_name = event.site_name;
          } else if (session.site_name === 'Unknown') {
            const extracted = extractSiteName(event);
            if (extracted) {
              session.site_name = extracted;
            }
          }
          if (event.device && event.device.trim() !== '' && event.device !== 'unknown') {
            session.device = event.device;
          }
          if (event.source && event.source.trim() !== '' && event.source !== 'direct') {
            session.source = event.source;
          }

          // Counters - using the same flexible matching
          if (isPageViewEvent(event.event_type)) {
            session.page_views++;
          }
          if (isClickEvent(event.event_type)) {
            session.clicks++;
          }

          // Breakdowns
          const uniqueKey = (event.ip_address && event.ip_address !== 'unknown') ? event.ip_address : event.session_id;
          if (isClickEvent(event.event_type) && event.related_search_id) {
            const term = relatedSearchMap.get(event.related_search_id) || 'Unknown';
            if (!session.related_search_clicks.has(term)) {
              session.related_search_clicks.set(term, { clicks: 0, uniques: new Set<string>() });
            }
            const entry = session.related_search_clicks.get(term)!;
            entry.clicks += 1;
            entry.uniques.add(uniqueKey);
          }
          if (isClickEvent(event.event_type) && event.blog_id) {
            const title = blogMap.get(event.blog_id) || 'Unknown';
            if (!session.blog_clicks.has(title)) {
              session.blog_clicks.set(title, { clicks: 0, uniques: new Set<string>() });
            }
            const entry = session.blog_clicks.get(title)!;
            entry.clicks += 1;
            entry.uniques.add(uniqueKey);
          }

          // Update last active
          if (new Date(event.created_at).getTime() > new Date(session.last_active).getTime()) {
            session.last_active = event.created_at;
          }
        });

        const details = Array.from(sessionMap.values()).map((s: any) => ({
          ...s,
          related_search_breakdown: Array.from(s.related_search_clicks.entries()).map(([search_term, val]: any) => ({
            search_term,
            click_count: val.clicks,
            unique_clicks: val.uniques.size,
          })),
          blog_clicks_breakdown: Array.from(s.blog_clicks.entries()).map(([blog_title, val]: any) => ({
            blog_title,
            click_count: val.clicks,
            unique_clicks: val.uniques.size,
          })),
        }));

        console.log(`✅ Processed ${details.length} session details`);
        console.log('📋 Sample session detail:', details[0]);
        
        setDataOrbitAnalyticsDetails(details.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } else {
        console.log('⚠️  No analytics data found');
        setDataOrbitAnalytics({ sessions: 0, page_views: 0, clicks: 0 });
        setDataOrbitAnalyticsDetails([]);
      }
    } catch (error) {
      console.error('❌ Error fetching DataOrbitZone analytics:', error);
      toast.error('Failed to fetch DataOrbitZone analytics. Check database connection.');
    }
  };

  const fetchSearchProjectAnalytics = async () => {
    try {
      const { data: analyticsData, error } = await searchProjectClient
        .from('analytics')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      console.log('SearchProject Analytics:', analyticsData);
      setSearchProjectAnalytics(analyticsData || []);
    } catch (error) {
      console.error('Error fetching SearchProject analytics:', error);
      toast.error('Failed to fetch SearchProject analytics');
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
      case 'dataorbitzone': return dataOrbitZoneClient;
      case 'searchproject': return searchProjectClient;
      case 'tejastarin': return tejaStarinClient;
      default: return supabase;
    }
  };

  const getProjectName = (website: Website) => {
    switch (website) {
      case 'topicmingle': return 'TopicMingle';
      case 'dataorbitzone': return 'DataOrbitZone';
      case 'searchproject': return 'SearchProject';
      case 'tejastarin': return 'Teja Starin';
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
        return <RelatedSearchManager projectClient={client} projectName={projectName} />;

      case 'webresults':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinWebResults />;
        }
        return <WebResultsManager projectClient={client} projectName={projectName} />;

      case 'prelanding':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinPreLanding />;
        }
        return <PreLandingEditor projectClient={client} projectName={projectName} />;

      case 'emails':
        if (selectedWebsite === 'tejastarin') {
          return <TejaStarinEmailCaptures />;
        }
        return <EmailCaptureViewer projectClient={client} />;

      case 'landing':
        if (selectedWebsite === 'searchproject') {
          const handleSpLandingSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            
            if (!spLandingFormData.title || !spLandingFormData.description) {
              toast.error("Please fill in both title and description");
              return;
            }

            // Generate page_key from title
            const page_key = spLandingFormData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const landingData = {
              page_key,
              headline: spLandingFormData.title,
              description: spLandingFormData.description,
              target_url: '#', // Default placeholder
              logo_position: 'top-center',
              logo_width: 150,
              image_ratio: '16:9',
              headline_font_size: 32,
              headline_color: '#000000',
              headline_align: 'center',
              description_font_size: 16,
              description_color: '#333333',
              description_align: 'center',
              cta_text: 'Get Started',
              cta_color: '#10b981',
              background_color: '#ffffff',
            };

            try {
              if (editingSpLanding) {
                const { error } = await searchProjectClient
                  .from('pre_landing_pages')
                  .update(landingData)
                  .eq('id', editingSpLanding.id);

                if (error) {
                  toast.error("Failed to update landing page");
                } else {
                  toast.success("Landing page updated successfully");
                  fetchSpLandingPages();
                  setShowSpLandingForm(false);
                  setEditingSpLanding(null);
                  setSpLandingFormData({ title: '', description: '' });
                }
              } else {
                const { error } = await searchProjectClient
                  .from('pre_landing_pages')
                  .insert([landingData]);

                if (error) {
                  toast.error("Failed to create landing page");
                } else {
                  toast.success("Landing page created successfully");
                  fetchSpLandingPages();
                  setShowSpLandingForm(false);
                  setSpLandingFormData({ title: '', description: '' });
                }
              }
            } catch (error) {
              console.error('Error saving landing page:', error);
              toast.error("Failed to save landing page");
            }
          };

          const handleEditSpLanding = (page: any) => {
            setEditingSpLanding(page);
            setSpLandingFormData({
              title: page.headline || '',
              description: page.description || '',
            });
            setShowSpLandingForm(true);
          };

          const handleDeleteSpLanding = async (id: string) => {
            if (!confirm('Are you sure you want to delete this landing page?')) return;

            const { error } = await searchProjectClient
              .from('pre_landing_pages')
              .delete()
              .eq('id', id);

            if (error) {
              toast.error("Failed to delete landing page");
            } else {
              toast.success("Landing page deleted successfully");
              fetchSpLandingPages();
            }
          };

          const getRelatedSearchesForPage = (pageKey: string) => {
            return spRelatedSearches.filter(search => search.pre_landing_page_key === pageKey);
          };

          return (
            <div className="bg-card rounded-lg border">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">SearchProject - Landing Pages</h2>
                <Button 
                  onClick={() => {
                    setShowSpLandingForm(!showSpLandingForm);
                    setEditingSpLanding(null);
                    setSpLandingFormData({ title: '', description: '' });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Landing Page
                </Button>
              </div>

              {/* Add/Edit Form */}
              {showSpLandingForm && (
                <form onSubmit={handleSpLandingSubmit} className="p-6 border-b bg-muted/30">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingSpLanding ? 'Edit Landing Page' : 'Add New Landing Page'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sp-title">Title *</Label>
                      <Input
                        id="sp-title"
                        value={spLandingFormData.title}
                        onChange={(e) => setSpLandingFormData({ ...spLandingFormData, title: e.target.value })}
                        placeholder="Enter title"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sp-description">Description *</Label>
                      <Textarea
                        id="sp-description"
                        value={spLandingFormData.description}
                        onChange={(e) => setSpLandingFormData({ ...spLandingFormData, description: e.target.value })}
                        placeholder="Enter description"
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit">
                      {editingSpLanding ? 'Update' : 'Save'} Changes
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowSpLandingForm(false);
                        setEditingSpLanding(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Landing Pages Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Title</th>
                      <th className="text-left p-4 font-semibold">Description</th>
                      <th className="text-left p-4 font-semibold">Related Searches</th>
                      <th className="text-left p-4 font-semibold">Created</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spLandingPages.map((page) => {
                      const relatedSearches = getRelatedSearchesForPage(page.page_key);
                      return (
                        <tr key={page.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{page.headline}</td>
                          <td className="p-4 text-muted-foreground max-w-md">
                            {page.description || '-'}
                          </td>
                          <td className="p-4 text-sm max-w-xs">
                            {relatedSearches.length > 0 ? (
                              <span className="text-xs">
                                {relatedSearches.map(s => s.search_text).join(' >>> ')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">None</span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground whitespace-nowrap">
                            {new Date(page.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSpLanding(page)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSpLanding(page.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
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
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedSection(null)}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to Sections
              </Button>
              <h2 className="text-2xl font-bold">
                {getProjectName(selectedWebsite)} - {sections[selectedWebsite].find(s => s.id === selectedSection)?.name}
              </h2>
            </div>

            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;