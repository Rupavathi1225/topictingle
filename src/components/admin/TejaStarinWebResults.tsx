import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, Edit } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';

export const TejaStarinWebResults = () => {
  const [webResults, setWebResults] = useState<any[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [preLandingConfigs, setPreLandingConfigs] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState('1');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    target_url: '',
    description: '',
    logo_url: '',
    is_sponsored: false,
    related_search_id: '',
    position: 1,
  });

  useEffect(() => {
    fetchWebResults();
    fetchRelatedSearches();
    fetchPreLandingConfigs();
  }, [selectedPage]);

  const fetchRelatedSearches = async () => {
    const { data, error } = await tejaStarinClient
      .from('related_searches')
      .select('*, blogs(title)')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch related searches:', error);
      return;
    }
    if (data) setRelatedSearches(data);
  };

  const fetchPreLandingConfigs = async () => {
    const { data, error } = await tejaStarinClient
      .from('pre_landing_config')
      .select('related_search_id');
    
    if (error) {
      console.error('Failed to fetch pre-landing configs:', error);
      return;
    }
    if (data) setPreLandingConfigs(data);
  };

  const fetchWebResults = async () => {
    const { data, error } = await tejaStarinClient
      .from('web_results')
      .select('*, related_searches(search_text, blogs(title))')
      .eq('page_number', parseInt(selectedPage))
      .order('is_sponsored', { ascending: false })
      .order('position', { ascending: true });
    
    if (error) {
      toast.error('Failed to fetch web results');
      return;
    }
    if (data) setWebResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.target_url) {
      toast.error('Please fill in required fields');
      return;
    }

    const payload = {
      page_number: parseInt(selectedPage),
      title: formData.title,
      target_url: formData.target_url,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      is_sponsored: formData.is_sponsored,
      related_search_id: formData.related_search_id || null,
      position: formData.position,
      is_active: true,
    };

    if (editingResult) {
      const { error } = await tejaStarinClient
        .from('web_results')
        .update(payload)
        .eq('id', editingResult.id);
      
      if (error) {
        toast.error('Failed to update web result');
      } else {
        toast.success('Web result updated!');
        setDialogOpen(false);
        setEditingResult(null);
        fetchWebResults();
      }
    } else {
      const nextPosition = webResults.length > 0 
        ? Math.max(...webResults.map(r => r.position ?? 0)) + 1 
        : 1;

      const { error } = await tejaStarinClient
        .from('web_results')
        .insert([{ ...payload, position: nextPosition }]);
      
      if (error) {
        toast.error('Failed to add web result');
        console.error(error);
      } else {
        toast.success('Web result added successfully');
        setDialogOpen(false);
        fetchWebResults();
      }
    }
  };

  const handleEdit = (result: any) => {
    setEditingResult(result);
    setFormData({
      title: result.title,
      target_url: result.target_url,
      description: result.description || '',
      logo_url: result.logo_url || '',
      is_sponsored: result.is_sponsored || false,
      related_search_id: result.related_search_id || '',
      position: result.position || 1,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this web result?')) return;
    
    const { error } = await tejaStarinClient
      .from('web_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete web result');
    } else {
      toast.success('Web result deleted');
      fetchWebResults();
    }
  };

  const resetForm = () => {
    setEditingResult(null);
    setFormData({
      title: '',
      target_url: '',
      description: '',
      logo_url: '',
      is_sponsored: false,
      related_search_id: '',
      position: 1,
    });
  };

  const hasPreLanding = (relatedSearchId: string) => {
    return preLandingConfigs.some(p => p.related_search_id === relatedSearchId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Web Results Page</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger>
              <SelectValue placeholder="Select a page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Page 1 (wr=1)</SelectItem>
              <SelectItem value="2">Page 2 (wr=2)</SelectItem>
              <SelectItem value="3">Page 3 (wr=3)</SelectItem>
              <SelectItem value="4">Page 4 (wr=4)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            URL: /tejastarin/wr?wr={selectedPage}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Web Results for Page {selectedPage}</h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Web Result
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingResult ? 'Edit Web Result' : 'Add Web Result'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Related Search *</Label>
              <Select value={formData.related_search_id} onValueChange={(value) => setFormData({ ...formData, related_search_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a related search..." />
                </SelectTrigger>
                <SelectContent>
                  {relatedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      <span className="flex items-center gap-2">
                        {search.search_text}
                        {search.blogs?.title && (
                          <span className="text-muted-foreground text-xs">({search.blogs.title})</span>
                        )}
                        {hasPreLanding(search.id) && (
                          <Badge className="text-xs bg-green-600">Has Pre-landing</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {relatedSearches.length} related searches available
              </p>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>URL *</Label>
              <Input
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sponsored"
                checked={formData.is_sponsored}
                onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
              />
              <Label htmlFor="sponsored">Is Sponsored</Label>
            </div>
            <Button type="submit" className="w-full">
              {editingResult ? 'Update Web Result' : 'Save Web Result'}
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
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Related Search</th>
                  <th className="text-left p-4">URL</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webResults.map((result) => (
                  <tr key={result.id} className="border-b">
                    <td className="p-4 font-medium">{result.title}</td>
                    <td className="p-4">
                      {result.related_searches ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{result.related_searches.search_text}</span>
                          {hasPreLanding(result.related_search_id) && (
                            <Badge className="text-xs bg-green-600 w-fit">Has Pre-landing</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">{result.target_url}</td>
                    <td className="p-4">
                      {result.is_sponsored && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Sponsored
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(result)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(result.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {webResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No web results found for Page {selectedPage}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};