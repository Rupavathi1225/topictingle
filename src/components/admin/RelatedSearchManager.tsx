import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  position: number;
  pre_landing_page_key: string | null;
  is_active: boolean;
  display_order: number;
  allowed_countries: string[];
}

interface Blog {
  id: string;
  title: string;
}

interface RelatedSearchManagerProps {
  projectClient: any;
  categoryId?: number;
  projectName?: string;
}

export const RelatedSearchManager = ({ projectClient, categoryId, projectName }: RelatedSearchManagerProps) => {
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [formData, setFormData] = useState({
    blog_id: '',
    title: '',
    search_text: '',
    web_result_page: 1,
    position: 1,
    pre_landing_page_key: '',
    is_active: true,
    display_order: 0,
    allowed_countries: ['WW'],
  });

  useEffect(() => {
    fetchSearches();
    fetchBlogs();
  }, [categoryId]);

  const fetchBlogs = async () => {
    const { data, error } = await projectClient
      .from('blogs')
      .select('id, title')
      .order('title');
    
    if (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
      return;
    }
    if (data) setBlogs(data);
  };

  const fetchSearches = async () => {
    try {
      let query = projectClient.from('related_searches').select('*, blogs(title)');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Use a simple, broadly compatible ordering
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching related searches:', error);
        toast.error('Failed to load related searches');
        return;
      }

      if (data) setSearches(data);
    } catch (err: any) {
      console.error('Unexpected error fetching related searches:', err);
      toast.error('Failed to load related searches');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.blog_id) {
      toast.error('Please select a blog');
      return;
    }
    
    const basePayload: any = {
      blog_id: formData.blog_id,
      title: formData.title,
      search_text: formData.search_text,
      web_result_page: formData.web_result_page,
      position: formData.position,
      pre_landing_page_key: formData.pre_landing_page_key || null,
    };

    const payload = {
      ...basePayload,
      ...(categoryId && { category_id: categoryId }),
      ...(projectName === 'TopicMingle' && {
        is_active: formData.is_active,
        display_order: formData.display_order,
        allowed_countries: formData.allowed_countries,
      }),
    };

    if (editingSearch) {
      const { error } = await projectClient
        .from('related_searches')
        .update(payload)
        .eq('id', editingSearch.id);
      
      if (error) {
        console.error('Failed to update search:', error);
        toast.error('Failed to update search');
      } else {
        toast.success('Search updated successfully');
        setDialogOpen(false);
        setEditingSearch(null);
        fetchSearches();
      }
    } else {
      const { error } = await projectClient
        .from('related_searches')
        .insert([payload]);
      
      if (error) {
        console.error('Failed to create search:', error);
        toast.error('Failed to create search');
      } else {
        toast.success('Search created successfully');
        setDialogOpen(false);
        fetchSearches();
      }
    }
  };

  const handleEdit = (search: RelatedSearch) => {
    setEditingSearch(search);
    setFormData({
      blog_id: (search as any).blog_id || '',
      title: search.title || '',
      search_text: search.search_text,
      web_result_page: search.web_result_page,
      position: search.position,
      pre_landing_page_key: search.pre_landing_page_key || '',
      is_active: search.is_active,
      display_order: search.display_order,
      allowed_countries: search.allowed_countries || ['WW'],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    
    const { error } = await projectClient.from('related_searches').delete().eq('id', id);
    
    if (error) {
      toast.error('Failed to delete search');
    } else {
      toast.success('Search deleted successfully');
      fetchSearches();
    }
  };

  const resetForm = () => {
    setFormData({
      blog_id: '',
      title: '',
      search_text: '',
      web_result_page: 1,
      position: 1,
      pre_landing_page_key: '',
      is_active: true,
      display_order: 0,
      allowed_countries: ['WW'],
    });
    setEditingSearch(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Related Searches</h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>Add Related Search</Button>
      </div>

      <div className="space-y-2">
        {searches.map((search) => (
          <div key={search.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
          <div>
            <p className="font-medium">{search.title || search.search_text}</p>
            <p className="text-sm text-muted-foreground">
              {(search as any).blogs?.title && <span className="text-primary font-medium">Blog: {(search as any).blogs.title} | </span>}
              Page: wr-{search.web_result_page} | Position: {search.position}
              {search.pre_landing_page_key && ` | Landing: ${search.pre_landing_page_key}`}
            </p>
          </div>
            <div className="space-x-2">
              <Button onClick={() => handleEdit(search)} variant="outline" size="sm">Edit</Button>
              <Button onClick={() => handleDelete(search.id)} variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSearch ? 'Edit' : 'Add'} Related Search</DialogTitle>
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
              {formData.blog_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Adding to: <span className="font-medium">{blogs.find(b => b.id === formData.blog_id)?.title}</span>
                </p>
              )}
            </div>

            <div>
              <Label>Title (visible to users)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Best Social Media Platforms 2024"
              />
            </div>

            <div>
              <Label>Search Text</Label>
              <Input
                value={formData.search_text}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                required
                placeholder="Internal search text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Web Result Page (1-4)</Label>
                <Select
                  value={formData.web_result_page.toString()}
                  onValueChange={(value) => setFormData({ ...formData, web_result_page: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Page 1</SelectItem>
                    <SelectItem value="2">Page 2</SelectItem>
                    <SelectItem value="3">Page 3</SelectItem>
                    <SelectItem value="4">Page 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Position (1-4)</Label>
                <Select
                  value={formData.position.toString()}
                  onValueChange={(value) => setFormData({ ...formData, position: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Position 1</SelectItem>
                    <SelectItem value="2">Position 2</SelectItem>
                    <SelectItem value="3">Position 3</SelectItem>
                    <SelectItem value="4">Position 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pre-Landing Page Key (optional)</Label>
              <Input
                value={formData.pre_landing_page_key}
                onChange={(e) => setFormData({ ...formData, pre_landing_page_key: e.target.value })}
                placeholder="e.g., wr-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to a pre-landing page for email capture before redirecting
              </p>
            </div>

              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first
                </p>
              </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSearch ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
