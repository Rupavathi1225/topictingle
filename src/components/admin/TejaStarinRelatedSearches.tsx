import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, Edit } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';

export const TejaStarinRelatedSearches = () => {
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<any>(null);
  const [formData, setFormData] = useState({
    search_text: '',
    blog_id: '',
    wr: 1,
    order_index: 0,
  });

  useEffect(() => {
    fetchRelatedSearches();
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    const { data, error } = await tejaStarinClient
      .from('blogs')
      .select('id, title')
      .order('title');
    
    if (error) {
      toast.error('Failed to fetch blogs');
      return;
    }
    if (data) setBlogs(data);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await tejaStarinClient
      .from('related_searches')
      .select('*, blogs(title)')
      .order('order_index', { ascending: true });
    
    if (error) {
      toast.error('Failed to fetch related searches');
      return;
    }
    if (data) setRelatedSearches(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.search_text || !formData.blog_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      blog_id: formData.blog_id,
      search_text: formData.search_text,
      wr: formData.wr,
      order_index: formData.order_index,
    };

    if (editingSearch) {
      const { error } = await tejaStarinClient
        .from('related_searches')
        .update(payload)
        .eq('id', editingSearch.id);
      
      if (error) {
        toast.error('Failed to update related search');
      } else {
        toast.success('Related search updated!');
        setDialogOpen(false);
        setEditingSearch(null);
        fetchRelatedSearches();
      }
    } else {
      const currentForBlog = relatedSearches.filter(s => s.blog_id === formData.blog_id);
      const nextOrderIndex = currentForBlog.length > 0 
        ? Math.max(...currentForBlog.map(s => s.order_index ?? 0)) + 1 
        : 0;

      const { error } = await tejaStarinClient
        .from('related_searches')
        .insert([{ ...payload, order_index: nextOrderIndex }]);
      
      if (error) {
        toast.error('Failed to add related search');
      } else {
        toast.success('Related search added!');
        setDialogOpen(false);
        fetchRelatedSearches();
      }
    }
  };

  const handleEdit = (search: any) => {
    setEditingSearch(search);
    setFormData({
      search_text: search.search_text,
      blog_id: search.blog_id,
      wr: search.wr || 1,
      order_index: search.order_index || 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this related search?')) return;
    
    const { error } = await tejaStarinClient
      .from('related_searches')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete related search');
    } else {
      toast.success('Related search deleted');
      fetchRelatedSearches();
    }
  };

  const resetForm = () => {
    setEditingSearch(null);
    setFormData({ search_text: '', blog_id: '', wr: 1, order_index: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Related Searches</h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Related Search
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSearch ? 'Edit Related Search' : 'Add Related Search'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Blog *</Label>
              <Select value={formData.blog_id} onValueChange={(value) => setFormData({ ...formData, blog_id: value })}>
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
              <Label>Search Text *</Label>
              <Input
                value={formData.search_text}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Web Result Page (1-4)</Label>
              <Select 
                value={formData.wr.toString()} 
                onValueChange={(value) => setFormData({ ...formData, wr: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Page 1 (wr=1)</SelectItem>
                  <SelectItem value="2">Page 2 (wr=2)</SelectItem>
                  <SelectItem value="3">Page 3 (wr=3)</SelectItem>
                  <SelectItem value="4">Page 4 (wr=4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order Index</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              />
            </div>
            <Button type="submit" className="w-full">
              {editingSearch ? 'Update Related Search' : 'Save Related Search'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4">Search Text</th>
                  <th className="text-left p-4">Blog</th>
                  <th className="text-left p-4">WR</th>
                  <th className="text-left p-4">Order</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {relatedSearches.map((search) => (
                  <tr key={search.id} className="border-b">
                    <td className="p-4 font-medium">{search.search_text}</td>
                    <td className="p-4">{search.blogs?.title || '-'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                        WR-{search.wr}
                      </span>
                    </td>
                    <td className="p-4">{search.order_index}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(search)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(search.id)}>
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
    </div>
  );
};
