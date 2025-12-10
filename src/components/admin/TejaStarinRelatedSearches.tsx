import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkActionToolbar } from './BulkActionToolbar';

export const TejaStarinRelatedSearches = () => {
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    search_text: '',
    blog_id: '',
    wr: 1,
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

    const currentForBlog = relatedSearches.filter(s => s.blog_id === formData.blog_id);
    const nextOrderIndex = currentForBlog.length > 0 
      ? Math.max(...currentForBlog.map(s => s.order_index ?? 0)) + 1 
      : 0;

    const payload = {
      blog_id: formData.blog_id,
      search_text: formData.search_text,
      wr: formData.wr,
      order_index: nextOrderIndex,
    };

    const { error } = await tejaStarinClient
      .from('related_searches')
      .insert([payload]);
    
    if (error) {
      toast.error('Failed to add related search');
    } else {
      toast.success('Related search added!');
      setShowForm(false);
      setFormData({ search_text: '', blog_id: '', wr: 1 });
      fetchRelatedSearches();
    }
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

  // Bulk action handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === relatedSearches.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(relatedSearches.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} related search(es)?`)) return;

    const ids = Array.from(selectedItems);
    const { error } = await tejaStarinClient
      .from('related_searches')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete related searches');
    } else {
      toast.success(`${ids.length} related search(es) deleted`);
      setSelectedItems(new Set());
      fetchRelatedSearches();
    }
  };

  const handleBulkActivate = async () => {
    if (selectedItems.size === 0) return;
    const ids = Array.from(selectedItems);
    const { error } = await tejaStarinClient
      .from('related_searches')
      .update({ is_active: true })
      .in('id', ids);

    if (error) {
      toast.error('Failed to activate related searches');
    } else {
      toast.success(`${ids.length} related search(es) activated`);
      setSelectedItems(new Set());
      fetchRelatedSearches();
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedItems.size === 0) return;
    const ids = Array.from(selectedItems);
    const { error } = await tejaStarinClient
      .from('related_searches')
      .update({ is_active: false })
      .in('id', ids);

    if (error) {
      toast.error('Failed to deactivate related searches');
    } else {
      toast.success(`${ids.length} related search(es) deactivated`);
      setSelectedItems(new Set());
      fetchRelatedSearches();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Related Searches</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Related Search'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Related Search</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Label>WR</Label>
                <Input
                  type="number"
                  value={formData.wr}
                  onChange={(e) => setFormData({ ...formData, wr: parseInt(e.target.value) || 1 })}
                />
              </div>
              <Button type="submit">Save Related Search</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <BulkActionToolbar
            selectedCount={selectedItems.size}
            totalCount={relatedSearches.length}
            onSelectAll={handleSelectAll}
            onDelete={handleBulkDelete}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            isAllSelected={selectedItems.size === relatedSearches.length && relatedSearches.length > 0}
            selectedData={relatedSearches.filter(s => selectedItems.has(s.id))}
            allData={relatedSearches}
            csvColumns={['id', 'search_text', 'blog_id', 'wr', 'order_index']}
            csvFilename="tejastarin_related_searches"
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 w-12">
                    <Checkbox
                      checked={selectedItems.size === relatedSearches.length && relatedSearches.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4">Search Text</th>
                  <th className="text-left p-4">Blog</th>
                  <th className="text-left p-4">WR</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {relatedSearches.map((search) => (
                  <tr key={search.id} className={`border-b ${selectedItems.has(search.id) ? 'bg-muted/50' : ''}`}>
                    <td className="p-4">
                      <Checkbox
                        checked={selectedItems.has(search.id)}
                        onCheckedChange={() => toggleSelection(search.id)}
                      />
                    </td>
                    <td className="p-4 font-medium">{search.search_text}</td>
                    <td className="p-4">{search.blogs?.title || '-'}</td>
                    <td className="p-4">{search.wr}</td>
                    <td className="p-4 text-right">
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
