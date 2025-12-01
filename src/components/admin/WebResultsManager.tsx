import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Edit, Trash2 } from 'lucide-react';

interface WebResult {
  id: string;
  title: string;
  description?: string;
  logo_url?: string;
  target_url: string;
  page_number: number;
  position: number;
  is_active: boolean;
  is_sponsored?: boolean;
  pre_landing_page_key?: string;
}

interface Blog {
  id: string;
  title: string;
}

interface WebResultsManagerProps {
  projectClient: any;
  projectName: string;
}

export const WebResultsManager = ({ projectClient, projectName }: WebResultsManagerProps) => {
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [formData, setFormData] = useState({
    blog_id: '',
    title: '',
    description: '',
    logo_url: '',
    target_url: '',
    page_number: 1,
    position: 1,
    is_active: true,
    is_sponsored: false,
    pre_landing_page_key: '',
  });

  useEffect(() => {
    fetchWebResults();
    fetchBlogs();
  }, []);

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

  const fetchWebResults = async () => {
    const { data, error } = await projectClient
      .from('web_results')
      .select('*, blogs(title)')
      .order('page_number', { ascending: true })
      .order('position', { ascending: true });
    
    if (error) {
      toast.error('Failed to fetch web results');
      return;
    }
    if (data) setWebResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      pre_landing_page_key: formData.pre_landing_page_key || null,
    };

    if (editingResult) {
      const { error } = await projectClient
        .from('web_results')
        .update(payload)
        .eq('id', editingResult.id);
      
      if (error) {
        toast.error('Failed to update web result');
      } else {
        toast.success('Web result updated successfully');
        setDialogOpen(false);
        setEditingResult(null);
        fetchWebResults();
      }
    } else {
      const { error } = await projectClient
        .from('web_results')
        .insert([payload]);
      
      if (error) {
        toast.error('Failed to create web result');
      } else {
        toast.success('Web result created successfully');
        setDialogOpen(false);
        fetchWebResults();
      }
    }
  };

  const handleEdit = (result: WebResult) => {
    setEditingResult(result);
    setFormData({
      blog_id: (result as any).blog_id || '',
      title: result.title,
      description: result.description || '',
      logo_url: result.logo_url || '',
      target_url: result.target_url,
      page_number: result.page_number,
      position: result.position,
      is_active: result.is_active,
      is_sponsored: result.is_sponsored || false,
      pre_landing_page_key: result.pre_landing_page_key || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this web result?')) return;
    
    const { error } = await projectClient.from('web_results').delete().eq('id', id);
    
    if (error) {
      toast.error('Failed to delete web result');
    } else {
      toast.success('Web result deleted successfully');
      fetchWebResults();
    }
  };

  const resetForm = () => {
    setFormData({
      blog_id: '',
      title: '',
      description: '',
      logo_url: '',
      target_url: '',
      page_number: 1,
      position: 1,
      is_active: true,
      is_sponsored: false,
      pre_landing_page_key: '',
    });
    setEditingResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Web Results for {projectName}</h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>Add Web Result</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4 font-semibold">Title</th>
              <th className="text-left p-4 font-semibold">Page</th>
              <th className="text-left p-4 font-semibold">Position</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-left p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {webResults.map((result) => (
              <tr key={result.id} className="border-b last:border-0">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{result.title}</p>
                    {(result as any).blogs?.title && (
                      <p className="text-xs text-primary font-medium">Blog: {(result as any).blogs.title}</p>
                    )}
                    {result.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{result.description}</p>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded">
                    Page {result.page_number}
                  </span>
                </td>
                <td className="p-4">#{result.position}</td>
                <td className="p-4">
                  {result.is_sponsored ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Sponsored</span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Organic</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    result.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {result.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(result)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(result.id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResult ? 'Edit' : 'Add'} Web Result</DialogTitle>
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
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Best Social Media Platform 2024"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of the web result..."
                rows={3}
              />
            </div>

            <div>
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional logo/icon to display with the web result
              </p>
            </div>

            <div>
              <Label>Target URL *</Label>
              <Input
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                required
                placeholder="https://example.com/page"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Page Number (1-4)</Label>
                <Select
                  value={formData.page_number.toString()}
                  onValueChange={(value) => setFormData({ ...formData, page_number: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Page 1 (/wr=1)</SelectItem>
                    <SelectItem value="2">Page 2 (/wr=2)</SelectItem>
                    <SelectItem value="3">Page 3 (/wr=3)</SelectItem>
                    <SelectItem value="4">Page 4 (/wr=4)</SelectItem>
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
                placeholder="e.g., wr-1-pos-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link to pre-landing page for email capture before redirecting to target URL
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_sponsored"
                  checked={formData.is_sponsored}
                  onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_sponsored">Sponsored Ad</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingResult ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
