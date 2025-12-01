import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';

export const TejaStarinBlogs = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    author: '',
    content: '',
    category_id: '',
    featured_image: '',
    status: 'published',
  });

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
      const { error } = await tejaStarinClient
        .from('blogs')
        .update(payload)
        .eq('id', editingBlog.id);
      
      if (error) {
        toast.error('Failed to update blog');
      } else {
        toast.success('Blog updated!');
        setDialogOpen(false);
        setEditingBlog(null);
        fetchBlogs();
      }
    } else {
      const { error } = await tejaStarinClient
        .from('blogs')
        .insert([payload]);
      
      if (error) {
        toast.error('Failed to create blog');
      } else {
        toast.success('Blog created!');
        setDialogOpen(false);
        fetchBlogs();
      }
    }
  };

  const handleEdit = (blog: any) => {
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
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    
    const { error } = await tejaStarinClient
      .from('blogs')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete blog');
    } else {
      toast.success('Blog deleted');
      fetchBlogs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Teja Starin Blogs</h3>
        <Button onClick={() => {
          setEditingBlog(null);
          setFormData({
            title: '',
            slug: '',
            author: '',
            content: '',
            category_id: '',
            featured_image: '',
            status: 'published',
          });
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
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
              />
            </div>
            <div>
              <Label>Featured Image URL</Label>
              <Input
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
              />
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

      <div className="bg-card rounded-lg border">
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
