import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fastMoneyClient } from "@/integrations/fastmoney/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, ExternalLink, Sparkles, Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar } from "./BulkActionToolbar";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  category: string | null;
  content: string;
  featured_image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["Finance", "Technology", "Lifestyle", "Business", "Health", "Education"];

export const FastMoneyBlogs = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    author: "",
    category: "",
    content: "",
    featured_image_url: "",
    status: "draft",
  });

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["fastmoney-blogs"],
    queryFn: async () => {
      const { data, error } = await fastMoneyClient
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Blog[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await fastMoneyClient.from("blogs").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
      toast.success("Blog created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Error creating blog: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await fastMoneyClient.from("blogs").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
      toast.success("Blog updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Error updating blog: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fastMoneyClient.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
      toast.success("Blog deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Error deleting blog: " + error.message);
    },
  });

  const generateImage = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    try {
      // For now, use a placeholder - you can integrate with your image generation service
      const placeholderImages = [
        'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
      ];
      const randomImage = placeholderImages[Math.floor(Math.random() * placeholderImages.length)];
      setFormData({ ...formData, featured_image_url: randomImage });
      toast.success("Image selected successfully");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Error generating image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      author: "",
      category: "",
      content: "",
      featured_image_url: "",
      status: "draft",
    });
    setEditingBlog(null);
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      author: blog.author || "",
      category: blog.category || "",
      content: blog.content,
      featured_image_url: blog.featured_image_url || "",
      status: blog.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const copyLink = (slug: string) => {
    const url = `https://fastmoney.site/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const openBlog = (slug: string) => {
    window.open(`https://fastmoney.site/blog/${slug}`, "_blank");
  };

  const filteredBlogs = blogs?.filter(blog =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
      await fastMoneyClient.from("blogs").delete().eq("id", id);
    }
    toast.success(`Deleted ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
  };

  const handleActivateBlogs = async () => {
    if (selectedBlogs.size === 0) return;
    for (const id of selectedBlogs) {
      await fastMoneyClient.from("blogs").update({ status: "published" }).eq("id", id);
    }
    toast.success(`Published ${selectedBlogs.size} blog(s)`);
    setSelectedBlogs(new Set());
    queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
  };

  const handleDeactivateBlogs = async () => {
    if (selectedBlogs.size === 0) return;
    for (const id of selectedBlogs) {
      await fastMoneyClient.from("blogs").update({ status: "draft" }).eq("id", id);
    }
    toast.success(`Set ${selectedBlogs.size} blog(s) to draft`);
    setSelectedBlogs(new Set());
    queryClient.invalidateQueries({ queryKey: ["fastmoney-blogs"] });
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
              <Plus className="w-4 h-4 mr-2" />
              Add Blog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-300">Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  required
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-[#2a3f5f]">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  required
                  className="bg-[#0d1520] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Featured Image</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateImage}
                      disabled={isGeneratingImage || !formData.title.trim()}
                      className="flex-shrink-0 border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Image
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={formData.featured_image_url}
                    onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                    placeholder="Or paste image URL here..."
                    className="bg-[#0d1520] border-[#2a3f5f] text-white placeholder:text-gray-500"
                  />
                  {formData.featured_image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.featured_image_url}
                        alt="Preview"
                        className="max-h-40 rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-[#0d1520] border-[#2a3f5f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                    <SelectItem value="draft" className="text-white hover:bg-[#2a3f5f]">Draft</SelectItem>
                    <SelectItem value="published" className="text-white hover:bg-[#2a3f5f]">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-[#00b4d8] hover:bg-[#0096b4] text-white">
                  {editingBlog ? "Update Blog" : "Create Blog"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                  Cancel
                </Button>
              </div>
            </form>
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
      />

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="rounded-md border border-[#2a3f5f] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a3f5f] hover:bg-transparent">
                <TableHead className="text-gray-300 w-12"></TableHead>
                <TableHead className="text-gray-300">Title</TableHead>
                <TableHead className="text-gray-300">Slug</TableHead>
                <TableHead className="text-gray-300">Category</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-right text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlogs.map((blog) => (
                <TableRow key={blog.id} className={`border-[#2a3f5f] ${selectedBlogs.has(blog.id) ? 'bg-[#00b4d8]/10' : 'hover:bg-[#0d1520]'}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedBlogs.has(blog.id)}
                      onCheckedChange={() => toggleBlogSelection(blog.id)}
                      className="border-gray-500"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-white">{blog.title}</TableCell>
                  <TableCell className="text-gray-400">{blog.slug}</TableCell>
                  <TableCell className="text-gray-400">{blog.category || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        blog.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {blog.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(blog.slug)}
                        title="Copy Link"
                        className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openBlog(blog.slug)}
                        title="Open Blog"
                        className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(blog)}
                        className="text-gray-400 hover:text-white hover:bg-[#2a3f5f]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(blog.id)}
                        className="text-destructive hover:bg-[#2a3f5f]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBlogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No blogs yet. Create your first blog!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default FastMoneyBlogs;
