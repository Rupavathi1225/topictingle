import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Sparkles, Loader2, FileText } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { supabase } from '@/integrations/supabase/client';
import { BlogImageSelector } from './BlogImageSelector';
import { BulkActionToolbar } from './BulkActionToolbar';

interface GeneratedSearch {
  text: string;
  selected: boolean;
  wr: number;
}

export const TejaStarinBlogs = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedSearches, setGeneratedSearches] = useState<GeneratedSearch[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    author: '',
    content: '',
    category_id: '',
    featured_image: '',
    status: 'published',
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === blogs.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(blogs.map(b => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} blog(s) and their related data?`)) return;
    
    for (const id of selectedItems) {
      try {
        const { data: relatedSearches } = await tejaStarinClient
          .from('related_searches')
          .select('id')
          .eq('blog_id', id);
        
        if (relatedSearches && relatedSearches.length > 0) {
          const relatedSearchIds = relatedSearches.map(rs => rs.id);
          await tejaStarinClient.from('email_submissions').delete().in('related_search_id', relatedSearchIds);
          await tejaStarinClient.from('analytics_events').delete().in('related_search_id', relatedSearchIds);
          await tejaStarinClient.from('pre_landing_config').delete().in('related_search_id', relatedSearchIds);
          await tejaStarinClient.from('web_results').delete().in('related_search_id', relatedSearchIds);
          await tejaStarinClient.from('related_searches').delete().eq('blog_id', id);
        }
        await tejaStarinClient.from('analytics_events').delete().eq('blog_id', id);
        await tejaStarinClient.from('blogs').delete().eq('id', id);
      } catch (err) {
        console.error('Error deleting blog:', err);
      }
    }
    toast.success(`Deleted ${selectedItems.size} blog(s)`);
    setSelectedItems(new Set());
    fetchBlogs();
  };

  const handleBulkActivate = async () => {
    const { error } = await tejaStarinClient
      .from('blogs')
      .update({ status: 'published' })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast.error('Failed to activate blogs');
    } else {
      toast.success(`Activated ${selectedItems.size} blog(s)`);
      setSelectedItems(new Set());
      fetchBlogs();
    }
  };

  const handleBulkDeactivate = async () => {
    const { error } = await tejaStarinClient
      .from('blogs')
      .update({ status: 'draft' })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast.error('Failed to deactivate blogs');
    } else {
      toast.success(`Deactivated ${selectedItems.size} blog(s)`);
      setSelectedItems(new Set());
      fetchBlogs();
    }
  };

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, []);

  const fetchBlogs = async () => {
    const { data, error } = await tejaStarinClient
      .from('blogs')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch blogs');
      return;
    }
    if (data) setBlogs(data);
  };

  const fetchCategories = async () => {
    const { data, error } = await tejaStarinClient
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Failed to fetch categories:', error);
    } else if (data) {
      setCategories(data);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const generateContent = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: { title: formData.title, slug: formData.slug, generateSearches: true }
      });

      if (error) throw error;

      if (data?.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
        
        if (data.relatedSearches && data.relatedSearches.length > 0) {
          setGeneratedSearches(data.relatedSearches.map((text: string) => ({
            text,
            selected: false,
            wr: 0
          })));
          toast.success(`Content and ${data.relatedSearches.length} related searches generated!`);
        } else {
          toast.success("Content generated successfully!");
        }
      } else {
        throw new Error("No content returned");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const generateImage = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-image', {
        body: { blogTitle: formData.title }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setFormData(prev => ({ ...prev, featured_image: data.imageUrl }));
        toast.success("AI image generated successfully!");
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const toggleSearchSelection = (index: number) => {
    const selectedCount = generatedSearches.filter(s => s.selected).length;
    const isCurrentlySelected = generatedSearches[index].selected;
    
    if (!isCurrentlySelected && selectedCount >= 4) {
      toast.error("You can only select up to 4 related searches");
      return;
    }

    setGeneratedSearches(prev => {
      const updated = [...prev];
      if (!isCurrentlySelected) {
        // Assign next available WR (1-4)
        const usedWRs = updated.filter(s => s.selected).map(s => s.wr);
        const nextWR = [1, 2, 3, 4].find(wr => !usedWRs.includes(wr)) || 1;
        updated[index] = { ...updated[index], selected: true, wr: nextWR };
      } else {
        updated[index] = { ...updated[index], selected: false, wr: 0 };
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug || !formData.author) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
    };

    if (editingBlog) {
      // Delete existing related searches for this blog first
      await tejaStarinClient
        .from('related_searches')
        .delete()
        .eq('blog_id', editingBlog.id);

      const { error } = await tejaStarinClient
        .from('blogs')
        .update(payload)
        .eq('id', editingBlog.id);
      
      if (error) {
        toast.error('Failed to update blog');
        return;
      }

      // Insert selected related searches
      const selectedSearches = generatedSearches.filter(s => s.selected);
      if (selectedSearches.length > 0) {
        const searchesToInsert = selectedSearches.map((search, idx) => ({
          blog_id: editingBlog.id,
          search_text: search.text,
          wr: search.wr,
          order_index: idx,
        }));
        
        await tejaStarinClient.from('related_searches').insert(searchesToInsert);
      }

      toast.success('Blog updated!');
      setDialogOpen(false);
      setEditingBlog(null);
      resetForm();
      fetchBlogs();
    } else {
      const { data: newBlog, error } = await tejaStarinClient
        .from('blogs')
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        toast.error('Failed to create blog');
        return;
      }

      // Insert selected related searches
      const selectedSearches = generatedSearches.filter(s => s.selected);
      if (selectedSearches.length > 0 && newBlog) {
        const searchesToInsert = selectedSearches.map((search, idx) => ({
          blog_id: newBlog.id,
          search_text: search.text,
          wr: search.wr,
          order_index: idx,
        }));
        
        const { error: searchError } = await tejaStarinClient
          .from('related_searches')
          .insert(searchesToInsert);
        
        if (searchError) {
          console.error('Error saving related searches:', searchError);
          toast.error('Blog created but failed to save related searches');
        } else {
          toast.success('Blog and related searches created!');
        }
      } else {
        toast.success('Blog created!');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchBlogs();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      author: '',
      content: '',
      category_id: '',
      featured_image: '',
      status: 'published',
    });
    setGeneratedSearches([]);
    setEditingBlog(null);
  };

  const handleEdit = async (blog: any) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      author: blog.author,
      content: blog.content,
      category_id: blog.category_id?.toString() || '',
      featured_image: blog.featured_image || '',
      status: blog.status || 'published',
    });

    // Load existing related searches for this blog
    const { data: existingSearches } = await tejaStarinClient
      .from('related_searches')
      .select('*')
      .eq('blog_id', blog.id)
      .order('order_index');

    if (existingSearches && existingSearches.length > 0) {
      setGeneratedSearches(existingSearches.map(s => ({
        text: s.search_text,
        selected: true,
        wr: s.wr || 1
      })));
    } else {
      setGeneratedSearches([]);
    }

    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog? This will also delete all related searches, web results, pre-landing configs, and email submissions.')) return;
    
    try {
      // Get all related searches for this blog
      const { data: relatedSearches } = await tejaStarinClient
        .from('related_searches')
        .select('id')
        .eq('blog_id', id);
      
      if (relatedSearches && relatedSearches.length > 0) {
        const relatedSearchIds = relatedSearches.map(rs => rs.id);
        
        // Delete email submissions linked to related searches
        await tejaStarinClient
          .from('email_submissions')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete analytics events linked to related searches
        await tejaStarinClient
          .from('analytics_events')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete pre-landing configs linked to related searches
        await tejaStarinClient
          .from('pre_landing_config')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete web results linked to related searches
        await tejaStarinClient
          .from('web_results')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete related searches
        await tejaStarinClient
          .from('related_searches')
          .delete()
          .eq('blog_id', id);
      }
      
      // Delete analytics events linked directly to blog
      await tejaStarinClient
        .from('analytics_events')
        .delete()
        .eq('blog_id', id);
      
      // Finally delete the blog
      const { error } = await tejaStarinClient
        .from('blogs')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Delete error:', error);
        toast.error(`Failed to delete blog: ${error.message}`);
      } else {
        toast.success('Blog and related data deleted');
        fetchBlogs();
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error deleting blog');
    }
  };

  // Link generator for copy functionality
  const blogLinkGenerator = (blog: any) => {
    const category = categories.find(c => c.id === blog.category_id);
    const categorySlug = category?.slug || category?.name?.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
    return `${window.location.origin}/datacreditzone/blog/${categorySlug}/${blog.slug}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">DataCreditZone Blogs</h3>
        <Button onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Blog
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? 'Edit Blog' : 'Create New Blog'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData({ ...formData, title, slug: generateSlug(title) });
                }}
                required
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Author *</Label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
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
              <div className="flex items-center justify-between mb-2">
                <Label>Content *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateContent}
                  disabled={isGeneratingContent || !formData.title}
                  className="gap-2"
                >
                  {isGeneratingContent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Content
                </Button>
              </div>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
              />
            </div>

            {/* Related Searches Selection */}
            {generatedSearches.length > 0 && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">
                    Select Related Searches (max 4)
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {generatedSearches.filter(s => s.selected).length}/4 selected
                  </span>
                </div>
                <div className="space-y-2">
                  {generatedSearches.map((search, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        search.selected 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleSearchSelection(index)}
                    >
                      <Checkbox
                        checked={search.selected}
                        onCheckedChange={() => toggleSearchSelection(index)}
                      />
                      <span className="flex-1">{search.text}</span>
                      {search.selected && (
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                          WR-{search.wr}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Featured Image</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateImage}
                  disabled={isGeneratingImage || !formData.title}
                  className="gap-2"
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
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="Enter image URL or generate with AI"
              />
              {formData.featured_image && (
                <img 
                  src={formData.featured_image} 
                  alt="Featured" 
                  className="mt-2 w-full max-h-48 object-cover rounded-lg"
                />
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {editingBlog ? 'Update Blog' : 'Create Blog'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BulkActionToolbar
        selectedCount={selectedItems.size}
        totalCount={blogs.length}
        onSelectAll={handleSelectAll}
        onDelete={handleBulkDelete}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        isAllSelected={selectedItems.size === blogs.length && blogs.length > 0}
        selectedData={blogs.filter(b => selectedItems.has(b.id))}
        allData={blogs}
        csvColumns={['id', 'title', 'slug', 'author', 'status', 'category_id', 'created_at']}
        csvFilename="tejastarin_blogs"
        linkGenerator={blogLinkGenerator}
      />

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 w-10"></th>
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
                  <td className="p-4">
                    <Checkbox
                      checked={selectedItems.has(blog.id)}
                      onCheckedChange={() => toggleSelection(blog.id)}
                    />
                  </td>
                  <td className="p-4 font-medium">{blog.title}</td>
                  <td className="p-4">{blog.author}</td>
                  <td className="p-4">{blog.categories?.name || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${blog.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {blog.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(blog)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(blog.id)}>
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
      </div>
    </div>
  );
};
