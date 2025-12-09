import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkActionToolbar } from './BulkActionToolbar';

export const TejaStarinWebResults = () => {
  const [webResults, setWebResults] = useState<any[]>([]);
  const [allWebResults, setAllWebResults] = useState<any[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<any[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [forceReplace, setForceReplace] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    logo_url: '',
    is_sponsored: false,
    order_index: 0,
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
    if (selectedItems.size === webResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(webResults.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} web result(s)?`)) return;
    
    const { error } = await tejaStarinClient
      .from('web_results')
      .delete()
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast.error('Failed to delete web results');
    } else {
      toast.success(`Deleted ${selectedItems.size} web result(s)`);
      setSelectedItems(new Set());
      fetchWebResults();
    }
  };

  const handleBulkActivate = async () => {
    const { error } = await tejaStarinClient
      .from('web_results')
      .update({ is_active: true })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast.error('Failed to activate web results');
    } else {
      toast.success(`Activated ${selectedItems.size} web result(s)`);
      setSelectedItems(new Set());
      fetchWebResults();
    }
  };

  const handleBulkDeactivate = async () => {
    const { error } = await tejaStarinClient
      .from('web_results')
      .update({ is_active: false })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast.error('Failed to deactivate web results');
    } else {
      toast.success(`Deactivated ${selectedItems.size} web result(s)`);
      setSelectedItems(new Set());
      fetchWebResults();
    }
  };

  useEffect(() => {
    fetchRelatedSearches();
    fetchAllWebResults();
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

  const fetchAllWebResults = async () => {
    const { data, error } = await tejaStarinClient
      .from('web_results')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch all web results:', error);
      return;
    }
    if (data) setAllWebResults(data);
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

  // Position management functions
  const getTakenPositions = () => {
    if (!selectedSearchId) return [];
    return allWebResults
      .filter(wr => wr.related_search_id === selectedSearchId)
      .map(wr => wr.order_index);
  };

  const getResultAtPosition = (position: number) => {
    if (!selectedSearchId) return null;
    return allWebResults.find(wr => 
      wr.related_search_id === selectedSearchId && 
      wr.order_index === position
    );
  };

  const takenPositions = getTakenPositions();
  const isPositionTaken = takenPositions.includes(formData.order_index);
  const existingResultAtPosition = isPositionTaken ? getResultAtPosition(formData.order_index) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSearchId) {
      toast.error('Please select a related search first');
      return;
    }

    // Check if position is taken and force replace is not enabled
    if (isPositionTaken && !forceReplace) {
      toast.error('Position is already taken. Enable "Force Replace" to override.');
      return;
    }

    // If force replace is enabled and position is taken, delete existing first
    if (forceReplace && isPositionTaken && existingResultAtPosition) {
      const { error: deleteError } = await tejaStarinClient
        .from('web_results')
        .delete()
        .eq('id', existingResultAtPosition.id);
      
      if (deleteError) {
        toast.error('Failed to replace existing result');
        return;
      }
    }

    const payload = {
      related_search_id: selectedSearchId,
      title: formData.title,
      url: formData.url,
      target_url: formData.url,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      is_sponsored: formData.is_sponsored,
      order_index: formData.order_index,
    };

    const { error } = await tejaStarinClient
      .from('web_results')
      .insert([payload]);
    
    if (error) {
      toast.error('Failed to add web result');
    } else {
      toast.success(forceReplace && isPositionTaken ? 'Web result replaced successfully' : 'Web result added successfully');
      setShowForm(false);
      setForceReplace(false);
      setFormData({
        title: '',
        url: '',
        description: '',
        logo_url: '',
        is_sponsored: false,
        order_index: 0,
      });
      fetchWebResults();
      fetchAllWebResults();
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
                  
                  {/* Position Field with Indicator */}
                  <div>
                    <Label>Position *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                      className={isPositionTaken ? "border-yellow-500" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This result will appear at position #{formData.order_index}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground mr-2">Positions:</span>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(pos => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setFormData({ ...formData, order_index: pos })}
                          className={`w-6 h-6 text-xs rounded ${
                            takenPositions.includes(pos)
                              ? 'bg-red-500 text-white'
                              : 'bg-green-500 text-white'
                          } ${formData.order_index === pos ? 'ring-2 ring-primary' : ''}`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    
                    {/* Position Warning */}
                    {isPositionTaken && existingResultAtPosition && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center gap-2 text-yellow-700 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Position {formData.order_index} is taken by: "{existingResultAtPosition.title}"</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id="forceReplace"
                            checked={forceReplace}
                            onCheckedChange={(checked) => setForceReplace(checked === true)}
                          />
                          <Label htmlFor="forceReplace" className="text-sm text-yellow-700">
                            Force replace existing result
                          </Label>
                        </div>
                      </div>
                    )}
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

          <BulkActionToolbar
            selectedCount={selectedItems.size}
            totalCount={webResults.length}
            onSelectAll={handleSelectAll}
            onDelete={handleBulkDelete}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            isAllSelected={selectedItems.size === webResults.length && webResults.length > 0}
          />

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 w-10"></th>
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">URL</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Sponsored</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webResults.map((result) => (
                      <tr key={result.id} className="border-b">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedItems.has(result.id)}
                            onCheckedChange={() => toggleSelection(result.id)}
                          />
                        </td>
                        <td className="p-4 font-medium">{result.title}</td>
                        <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">{result.url}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${result.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {result.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
