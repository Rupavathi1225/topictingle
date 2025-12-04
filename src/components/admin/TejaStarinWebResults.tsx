import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';

export const TejaStarinWebResults = () => {
  const [webResults, setWebResults] = useState<any[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    logo_url: '',
    is_sponsored: false,
  });

  useEffect(() => {
    fetchRelatedSearches();
  }, []);

  useEffect(() => {
    if (selectedSearchId) {
      fetchWebResults();
    }
  }, [selectedSearchId]);

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

  const fetchWebResults = async () => {
    const { data, error } = await tejaStarinClient
      .from('web_results')
      .select('*')
      .eq('related_search_id', selectedSearchId)
      .order('is_sponsored', { ascending: false })
      .order('order_index', { ascending: true });
    
    if (error) {
      toast.error('Failed to fetch web results');
      return;
    }
    if (data) setWebResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSearchId) {
      toast.error('Please select a related search first');
      return;
    }

    const currentForSearch = webResults.filter(r => r.related_search_id === selectedSearchId);
    const nextOrderIndex = currentForSearch.length > 0 
      ? Math.max(...currentForSearch.map(r => r.order_index ?? 0)) + 1 
      : 0;

    const payload = {
      related_search_id: selectedSearchId,
      title: formData.title,
      url: formData.url,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      is_sponsored: formData.is_sponsored,
      order_index: nextOrderIndex,
    };

    const { error } = await tejaStarinClient
      .from('web_results')
      .insert([payload]);
    
    if (error) {
      toast.error('Failed to add web result');
    } else {
      toast.success('Web result added successfully');
      setShowForm(false);
      setFormData({
        title: '',
        url: '',
        description: '',
        logo_url: '',
        is_sponsored: false,
      });
      fetchWebResults();
    }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Related Search</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSearchId} onValueChange={setSelectedSearchId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a related search" />
            </SelectTrigger>
            <SelectContent>
              {relatedSearches.map((search) => (
                <SelectItem key={search.id} value={search.id}>
                  {search.search_text} {search.wr && `››› WR-${search.wr}`} {(search as any).blogs?.title && `››› ${(search as any).blogs.title}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSearchId && (
            <p className="text-xs text-muted-foreground mt-2">
              Adding web result to: <span className="font-medium">{relatedSearches.find(s => s.id === selectedSearchId)?.search_text}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {selectedSearchId && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Web Results</h3>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Cancel' : 'Add Web Result'}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add Web Result</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sponsored"
                      checked={formData.is_sponsored}
                      onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                    />
                    <Label htmlFor="sponsored">Is Sponsored</Label>
                  </div>
                  <Button type="submit">Save Web Result</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">URL</th>
                      <th className="text-left p-4">Sponsored</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webResults.map((result) => (
                      <tr key={result.id} className="border-b">
                        <td className="p-4 font-medium">{result.title}</td>
                        <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">{result.url}</td>
                        <td className="p-4">
                          {result.is_sponsored && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              Sponsored
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(result.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {webResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No web results found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
