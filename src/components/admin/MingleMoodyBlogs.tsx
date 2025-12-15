import { useState, useEffect } from "react";
import { mingleMoodyClient } from "@/integrations/minglemoody/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy, ExternalLink, Loader2, Sparkles, Search, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  category: string | null;
  content: string | null;
  featured_image: string | null;
  status: string;
  related_search_id: string | null;
  created_at: string;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string | null;
}

interface GeneratedSearch {
  text: string;
  selected: boolean;
}

export const MingleMoodyBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [generatedSearches, setGeneratedSearches] = useState<GeneratedSearch[]>([]);
  
  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [status, setStatus] = useState("draft");
  const [relatedSearchId, setRelatedSearchId] = useState<string>("");

  useEffect(() => {
    fetchBlogs();
    fetchRelatedSearches();
  }, []);

  const fetchBlogs = async () => {
    const { data, error } = await mingleMoodyClient
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch blogs");
      return;
    }
    setBlogs(data || []);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await mingleMoodyClient
      .from("related_searches")
      .select("id, search_text, title")
      .eq("is_active", true);
    
    if (error) {
      console.error("Failed to fetch related searches:", error);
      return;
    }
    setRelatedSearches(data || []);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!editingBlog) {
      setSlug(generateSlug(value));
    }
  };

  const generateImage = async () => {
    if (!title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-image', {
        body: { blogTitle: title }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setFeaturedImage(data.imageUrl);
        toast.success("AI image generated successfully!");
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateContent = async () => {
    if (!title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: { title, slug, generateSearches: true }
      });

      if (error) throw error;

      if (data?.content) {
        setContent(data.content);
        if (data?.relatedSearches?.length) {
          setGeneratedSearches(data.relatedSearches.map((text: string) => ({ text, selected: false })));
        }
        toast.success("Content generated!");
      } else {
        throw new Error("No content returned");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const toggleSearchSelection = (index: number) => {
    const selectedCount = generatedSearches.filter(s => s.selected).length;
    const search = generatedSearches[index];
    
    if (!search.selected && selectedCount >= 4) {
      toast.error("Maximum 4 related searches can be selected");
      return;
    }
    
    setGeneratedSearches(prev => prev.map((s, i) => 
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setAuthor("");
    setCategory("");
    setContent("");
    setFeaturedImage("");
    setStatus("draft");
    setRelatedSearchId("");
    setGeneratedSearches([]);
    setEditingBlog(null);
  };

  const handleSave = async () => {
    if (!title || !slug) {
      toast.error("Title and slug are required");
      return;
    }

    const blogData = {
      title,
      slug,
      author: author || null,
      category: category || null,
      content: content || null,
      featured_image: featuredImage || null,
      status,
      related_search_id: relatedSearchId === "none" ? null : relatedSearchId || null,
    };

    let blogId = editingBlog?.id;

    if (editingBlog) {
      const { error } = await mingleMoodyClient
        .from("blogs")
        .update(blogData)
        .eq("id", editingBlog.id);

      if (error) {
        toast.error("Failed to update blog");
        return;
      }
    } else {
      const { data, error } = await mingleMoodyClient.from("blogs").insert(blogData).select().single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A blog with this slug already exists");
        } else {
          toast.error("Failed to create blog");
        }
        return;
      }
      blogId = data?.id;
    }

    // Save selected related searches
    const selectedSearches = generatedSearches.filter(s => s.selected);
    if (selectedSearches.length > 0 && blogId) {
      // First, remove any existing related searches for this blog
      await mingleMoodyClient.from("related_searches").delete().eq("blog_id", blogId);
      
      // Insert new selected searches
      const searchesToInsert = selectedSearches.map((s, idx) => ({
        search_text: s.text,
        title: s.text,
        blog_id: blogId,
        web_result_page: idx + 1,
        display_order: idx,
        position: idx + 1,
        is_active: true,
      }));
      
      const { error: searchError } = await mingleMoodyClient.from("related_searches").insert(searchesToInsert);
      if (searchError) {
        console.error("Failed to save related searches:", searchError);
      }
    }

    toast.success(editingBlog ? "Blog updated!" : "Blog created!");

    resetForm();
    setIsDialogOpen(false);
    fetchBlogs();
    fetchRelatedSearches();
  };

  const handleEdit = async (blog: Blog) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setSlug(blog.slug);
    setAuthor(blog.author || "");
    setCategory(blog.category || "");
    setContent(blog.content || "");
    setFeaturedImage(blog.featured_image || "");
    setStatus(blog.status);
    setRelatedSearchId(blog.related_search_id || "");
    
    // Load existing related searches for this blog
    const { data: searches } = await mingleMoodyClient
      .from("related_searches")
      .select("search_text")
      .eq("blog_id", blog.id)
      .order("display_order");
    
    if (searches?.length) {
      setGeneratedSearches(searches.map(s => ({ text: s.search_text, selected: true })));
    } else {
      setGeneratedSearches([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog?")) return;
    
    // First delete related searches linked to this blog
    await mingleMoodyClient.from("related_searches").delete().eq("blog_id", id);
    
    const { error } = await mingleMoodyClient.from("blogs").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete blog");
      return;
    }
    toast.success("Blog deleted successfully!");
    fetchBlogs();
    fetchRelatedSearches();
  };

  const selectedSearchCount = generatedSearches.filter(s => s.selected).length;

  const copyBlogUrl = (slug: string) => {
    const url = `https://minglemoody.com/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Blog URL copied to clipboard!");
  };

  const openBlogUrl = (slug: string) => {
    window.open(`https://minglemoody.com/blog/${slug}`, "_blank");
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bulk actions
  const handleSelectAllBlogs = () => {
    if (selectedBlogs.size === filteredBlogs.length) {
      setSelectedBlogs(new Set());
    } else {
      setSelectedBlogs(new Set(filteredBlogs.map(b => b.id)));
    }
  };

  const handleDeleteSelectedBlogs = async () => {
    if (selectedBlogs.size === 0) return;
    if (!confirm(`Delete ${selectedBlogs.size} selected blog(s)?`)) return;
    for (const id of selectedBlogs) {
      await mingleMoodyClient.from("blogs").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  const handleActivateBlogs = async () => {
    if (selectedBlogs.size === 0) return;
    for (const id of selectedBlogs) {
      await mingleMoodyClient.from("blogs").update({ status: "published" }).eq("id", id);
    }
    toast.success(`Published ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  const handleDeactivateBlogs = async () => {
    if (selectedBlogs.size === 0) return;
    for (const id of selectedBlogs) {
      await mingleMoodyClient.from("blogs").update({ status: "draft" }).eq("id", id);
    }
    toast.success(`Set ${selectedBlogs.size} blog(s) to draft`);
    setSelectedBlogs(new Set());
    fetchBlogs();
  };

  const toggleBlogSelection = (id: string) => {
    const newSelection = new Set(selectedBlogs);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedBlogs(newSelection);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#00b4d8] hover:bg-[#0096b4] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Blog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter blog title"
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Slug *</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-friendly-slug"
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Author</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name"
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Category</Label>
                <Select value={category || "none"} onValueChange={(val) => setCategory(val === "none" ? "" : val)}>
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    <SelectItem value="none" className="text-white hover:bg-[#2a3f5f]">Select category</SelectItem>
                    <SelectItem value="Finance" className="text-white hover:bg-[#2a3f5f]">Finance</SelectItem>
                    <SelectItem value="Technology" className="text-white hover:bg-[#2a3f5f]">Technology</SelectItem>
                    <SelectItem value="Lifestyle" className="text-white hover:bg-[#2a3f5f]">Lifestyle</SelectItem>
                    <SelectItem value="Business" className="text-white hover:bg-[#2a3f5f]">Business</SelectItem>
                    <SelectItem value="Health" className="text-white hover:bg-[#2a3f5f]">Health</SelectItem>
                    <SelectItem value="Education" className="text-white hover:bg-[#2a3f5f]">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateContent}
                    disabled={isGeneratingContent || !title}
                    className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                  >
                    {isGeneratingContent ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Generate Content
                  </Button>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog content here..."
                  rows={6}
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Featured Image</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateImage}
                    disabled={isGeneratingImage || !title}
                    className="flex-1 border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate AI Image
                  </Button>
                </div>
                <Input
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="Or paste image URL here..."
                  className="mt-2 bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                {featuredImage && (
                  <img
                    src={featuredImage}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg mt-2"
                  />
                )}
              </div>

              {/* Related Searches Selection */}
              {generatedSearches.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Select Related Searches (max 4)</Label>
                  <p className="text-xs text-gray-400">Selected searches will be linked to this blog and redirect to /wr=1, /wr=2, etc. Edit text as needed.</p>
                  <div className="border border-[#2a3f5f] rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto bg-[#0d1520]">
                    {generatedSearches.map((search, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-3 p-2 rounded transition-colors ${
                          search.selected ? 'bg-[#00b4d8]/20 border border-[#00b4d8]' : 'border border-transparent hover:bg-[#2a3f5f]'
                        }`}
                      >
                        <Checkbox
                          checked={search.selected}
                          onCheckedChange={() => toggleSearchSelection(idx)}
                          className="border-gray-500 data-[state=checked]:bg-[#00b4d8] data-[state=checked]:border-[#00b4d8]"
                        />
                        <Input
                          value={search.text}
                          onChange={(e) => {
                            const updated = [...generatedSearches];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setGeneratedSearches(updated);
                          }}
                          className={`flex-1 text-sm bg-[#0d1520] border-[#2a3f5f] text-white ${
                            search.selected ? 'border-[#00b4d8]' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {search.selected && (
                          <span className="text-xs text-[#00b4d8] whitespace-nowrap">→ /wr={generatedSearches.filter((s, i) => s.selected && i <= idx).length}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{selectedSearchCount}/4 selected</p>
                </div>
              )}

              {/* Legacy Related Search Dropdown - only show when no generated searches */}
              {generatedSearches.length === 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Related Search</Label>
                  <Select value={relatedSearchId} onValueChange={setRelatedSearchId}>
                    <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                      <SelectValue placeholder="Select a related search" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                      <SelectItem value="none" className="text-white hover:bg-[#2a3f5f]">None</SelectItem>
                      {relatedSearches.map((search) => (
                        <SelectItem key={search.id} value={search.id} className="text-white hover:bg-[#2a3f5f]">
                          {search.title || search.search_text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    <SelectItem value="draft" className="text-white hover:bg-[#2a3f5f]">Draft</SelectItem>
                    <SelectItem value="published" className="text-white hover:bg-[#2a3f5f]">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">
                  {editingBlog ? "Update Blog" : "Create Blog"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BulkActionToolbar
        selectedCount={selectedBlogs.size}
        totalCount={filteredBlogs.length}
        onSelectAll={handleSelectAllBlogs}
        onDelete={handleDeleteSelectedBlogs}
        onActivate={handleActivateBlogs}
        onDeactivate={handleDeactivateBlogs}
        isAllSelected={selectedBlogs.size === filteredBlogs.length && filteredBlogs.length > 0}
        isDarkTheme={true}
        selectedData={filteredBlogs.filter(b => selectedBlogs.has(b.id))}
        allData={blogs}
        csvColumns={['id', 'title', 'slug', 'author', 'status', 'category_id', 'created_at']}
        csvFilename="minglemoody_blogs"
      />

      <div className="space-y-4">
        {filteredBlogs.length === 0 ? (
          <Card className="bg-[#0d1520] border-[#2a3f5f]">
            <CardContent className="py-8 text-center text-gray-400">
              No blogs yet. Create your first blog!
            </CardContent>
          </Card>
        ) : (
          filteredBlogs.map((blog) => (
            <Card key={blog.id} className={`bg-[#0d1520] border-[#2a3f5f] ${selectedBlogs.has(blog.id) ? 'ring-1 ring-[#00b4d8]' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedBlogs.has(blog.id)}
                    onCheckedChange={() => toggleBlogSelection(blog.id)}
                    className="mt-1 border-gray-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{blog.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">/{blog.slug}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          blog.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {blog.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      {blog.author && <span>By {blog.author}</span>}
                      {blog.category && <span>• {blog.category}</span>}
                    </div>
                    {blog.featured_image && (
                      <img
                        src={blog.featured_image}
                        alt={blog.title}
                        className="w-full h-32 object-cover rounded-md mt-4"
                      />
                    )}
                    <div className="flex gap-2 flex-wrap mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyBlogUrl(blog.slug)}
                        className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy URL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBlogUrl(blog.slug)}
                        className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(blog)}
                        className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(blog.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MingleMoodyBlogs;
