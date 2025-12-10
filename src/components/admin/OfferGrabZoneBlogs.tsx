import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offerGrabZoneClient } from "@/integrations/offergrabzone/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { BulkActionToolbar } from "./BulkActionToolbar";

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  author: string | null;
  category: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  "Finance",
  "Technology",
  "Lifestyle",
  "Business",
  "Health",
  "Education",
];

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const OfferGrabZoneBlogs = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    featured_image_url: "",
    author: "",
    category: "",
    status: "published",
  });

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["offergrabzone-blogs"],
    queryFn: async () => {
      const { data, error } = await offerGrabZoneClient
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Blog[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Blog, "id" | "created_at" | "updated_at" | "is_active" | "excerpt">) => {
      const isActive = data.status === "published";
      const { error } = await offerGrabZoneClient.from("blogs").insert([{ ...data, is_active: isActive, excerpt: null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
      toast.success("Blog created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create blog: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Blog> & { id: string }) => {
      const updateData = { ...data };
      if (data.status === "published") {
        updateData.is_active = true;
      }
      const { error } = await offerGrabZoneClient.from("blogs").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
      toast.success("Blog updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update blog: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await offerGrabZoneClient.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
      toast.success("Blog deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete blog: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await offerGrabZoneClient.from("blogs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
      toast.success("Blog status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      featured_image_url: "",
      author: "",
      category: "",
      status: "published",
    });
    setEditingBlog(null);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const generateImage = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Placeholder - would call edge function
      toast.info("AI image generation coming soon");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug) {
      toast.error("Title and slug are required");
      return;
    }

    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content || "",
      featured_image_url: blog.featured_image_url || "",
      author: blog.author || "",
      category: blog.category || "",
      status: blog.status,
    });
    setIsDialogOpen(true);
  };

  const copyBlogLink = (slug: string) => {
    const url = `https://offergrabzone.com/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Blog link copied to clipboard!");
  };

  const openBlog = (slug: string) => {
    window.open(`https://offergrabzone.com/blog/${slug}`, "_blank");
  };

  // Filtering
  const filteredBlogs = blogs?.filter(blog =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Bulk actions
  const toggleBlogSelection = (id: string) => {
    const newSelected = new Set(selectedBlogs);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedBlogs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBlogs.size === filteredBlogs.length) {
      setSelectedBlogs(new Set());
    } else {
      setSelectedBlogs(new Set(filteredBlogs.map(b => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedBlogs.size} blog(s)?`)) return;
    for (const id of selectedBlogs) {
      await offerGrabZoneClient.from("blogs").delete().eq("id", id);
    }
    queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
    toast.success(`Deleted ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
  };

  const handleBulkActivate = async () => {
    await offerGrabZoneClient.from("blogs").update({ is_active: true, status: "published" }).in("id", Array.from(selectedBlogs));
    queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
    toast.success(`Activated ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
  };

  const handleBulkDeactivate = async () => {
    await offerGrabZoneClient.from("blogs").update({ is_active: false, status: "draft" }).in("id", Array.from(selectedBlogs));
    queryClient.invalidateQueries({ queryKey: ["offergrabzone-blogs"] });
    toast.success(`Deactivated ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0d1520] border-[#2a3f5f] text-white"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#00b4d8] hover:bg-[#00a0c0] text-white">
              <Plus className="w-4 h-4" />
              Add Blog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingBlog ? "Update your blog post details below." : "Fill in the details to create a new blog post."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter blog title"
                  required
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-white">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated-from-title"
                  required
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author" className="text-white">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author name"
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-white">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-[#2a3f5f]">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Featured Image</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateImage}
                    disabled={isGeneratingImage || !formData.title}
                    className="gap-2 border-[#2a3f5f] text-white hover:bg-[#2a3f5f]"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate AI Image
                  </Button>
                </div>
                <Input
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="Or paste image URL here..."
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
                {formData.featured_image_url && (
                  <img 
                    src={formData.featured_image_url} 
                    alt="Preview" 
                    className="w-full max-h-48 object-cover rounded-md mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-white">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Blog content..."
                  rows={6}
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-white">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    <SelectItem value="draft" className="text-white hover:bg-[#2a3f5f]">Draft</SelectItem>
                    <SelectItem value="published" className="text-white hover:bg-[#2a3f5f]">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[#2a3f5f] text-white hover:bg-[#2a3f5f]">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#00b4d8] hover:bg-[#00a0c0]">
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {editingBlog ? "Update" : "Create"} Blog
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedBlogs.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedBlogs.size}
          totalCount={filteredBlogs.length}
          onSelectAll={handleSelectAll}
          onDelete={handleBulkDelete}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          isAllSelected={selectedBlogs.size === filteredBlogs.length && filteredBlogs.length > 0}
          isDarkTheme={true}
          selectedData={filteredBlogs.filter(b => selectedBlogs.has(b.id))}
          allData={blogs}
          csvColumns={['id', 'title', 'slug', 'author', 'status', 'category_id', 'created_at']}
          csvFilename="offergrabzone_blogs"
        />
      )}

      <div className="border border-[#2a3f5f] rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-[#0d1520]">
            <TableRow className="border-[#2a3f5f]">
              <TableHead className="w-12 text-gray-300">
                <Checkbox
                  checked={selectedBlogs.size === filteredBlogs.length && filteredBlogs.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-gray-300">Title</TableHead>
              <TableHead className="text-gray-300">Slug</TableHead>
              <TableHead className="text-gray-300">Category</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Active</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBlogs.map((blog) => (
              <TableRow key={blog.id} className="border-[#2a3f5f] hover:bg-[#0d1520]">
                <TableCell>
                  <Checkbox
                    checked={selectedBlogs.has(blog.id)}
                    onCheckedChange={() => toggleBlogSelection(blog.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-white">{blog.title}</TableCell>
                <TableCell className="text-gray-400">{blog.slug}</TableCell>
                <TableCell className="text-gray-300">{blog.category || "-"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    blog.status === "published" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {blog.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={blog.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: blog.id, is_active: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyBlogLink(blog.slug)}
                      title="Copy link"
                      className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openBlog(blog.slug)}
                      title="Open blog"
                      className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(blog)}
                      title="Edit"
                      className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(blog.id)}
                      title="Delete"
                      className="text-gray-400 hover:text-red-400 hover:bg-[#2a3f5f]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredBlogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  No blogs yet. Create your first blog!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OfferGrabZoneBlogs;
