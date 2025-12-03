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
  related_search_id?: string;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  title?: string;
  web_result_page: number;
}

interface WebResultsManagerProps {
  projectClient: any;
  projectName: string;
}

export const WebResultsManager = ({ projectClient, projectName }: WebResultsManagerProps) => {
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [formData, setFormData] = useState({
    related_search_id: '',
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

  const isSearchProject = projectName === 'SearchProject';
  const isDataOrbitZone = projectName === 'DataOrbitZone';

  useEffect(() => {
    fetchWebResults();
    if (!isDataOrbitZone) {
      fetchRelatedSearches();
    }
  }, [projectName]);
 
  const fetchRelatedSearches = async () => {
    const { data, error } = await projectClient
      .from('related_searches')
      .select('id, search_text, title, web_result_page')
      .order('display_order');
    
    if (error) {
      console.error('Error fetching related searches:', error);
      toast.error('Failed to fetch related searches');
      return;
    }
    if (data) setRelatedSearches(data);
  };

  const fetchWebResults = async () => {
    const { data, error } = await projectClient
      .from('web_results')
      .select('*')
      .order('page_number', { ascending: true })
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Error fetching web results:', error);
      toast.error('Failed to fetch web results');
      return;
    }
    if (data) setWebResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require related_search_id for projects that use it
    if (!isDataOrbitZone && !isSearchProject && !formData.related_search_id) {
      toast.error('Please select a related search');
      return;
    }
    
    const payload: any = {
      title: formData.title,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      target_url: formData.target_url,
      page_number: formData.page_number,
      position: formData.position,
      is_active: formData.is_active,
      is_sponsored: formData.is_sponsored,
      pre_landing_page_key: formData.pre_landing_page_key || null,
    };

    // Only add related_search_id for projects that use it
    if (!isDataOrbitZone && !isSearchProject && formData.related_search_id) {
      payload.related_search_id = formData.related_search_id;
    }

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
      related_search_id: result.related_search_id || '',
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
      related_search_id: '',
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

  // Conditional styling for SearchProject dark theme
  const containerClass = isSearchProject 
    ? "space-y-4 bg-[#0a1628] min-h-screen p-6 rounded-lg" 
    : "space-y-4";

  const headerClass = isSearchProject
    ? "text-lg font-semibold text-white"
    : "text-lg font-semibold";

  const buttonClass = isSearchProject
    ? "bg-[#00b4d8] hover:bg-[#0096c7] text-white"
    : "";

  const tableContainerClass = isSearchProject
    ? "bg-[#1a2942] rounded-lg border border-[#2a3f5f] overflow-x-auto"
    : "bg-card rounded-lg border overflow-x-auto";

  const thClass = isSearchProject
    ? "text-left p-4 font-semibold text-gray-300"
    : "text-left p-4 font-semibold";

  const tdClass = isSearchProject
    ? "p-4 text-white"
    : "p-4";

  const mutedClass = isSearchProject
    ? "text-sm text-gray-400 line-clamp-1"
    : "text-sm text-muted-foreground line-clamp-1";

  const dialogClass = isSearchProject
    ? "max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a2942] border-[#2a3f5f]"
    : "max-w-2xl max-h-[90vh] overflow-y-auto";

  const inputClass = isSearchProject
    ? "bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
    : "";

  const labelClass = isSearchProject
    ? "text-gray-300"
    : "";

  const showRelatedSearchField = !isDataOrbitZone && !isSearchProject;

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center">
        <h3 className={headerClass}>Web Results for {projectName}</h3>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className={buttonClass}
        >
          Add Web Result
        </Button>
      </div>

      <div className={tableContainerClass}>
        <table className="w-full">
          <thead className={isSearchProject ? "border-b border-[#2a3f5f]" : "border-b"}>
            <tr>
              <th className={thClass}>Title</th>
              <th className={thClass}>Page</th>
              <th className={thClass}>Position</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {webResults.map((result) => (
              <tr key={result.id} className={isSearchProject ? "border-b border-[#2a3f5f] last:border-0" : "border-b last:border-0"}>
                <td className={tdClass}>
                  <div>
                    <p className={isSearchProject ? "font-medium text-white" : "font-medium"}>{result.title}</p>
                    {result.related_search_id && !isSearchProject && (
                      <p className="text-xs text-primary font-medium">
                        Linked to related search ID: {result.related_search_id}
                      </p>
                    )}
                    {result.description && (
                      <p className={mutedClass}>{result.description}</p>
                    )}
                  </div>
                </td>
                <td className={tdClass}>
                  <span className={isSearchProject 
                    ? "px-2 py-1 bg-[#00b4d8]/20 text-[#00b4d8] text-xs font-semibold rounded"
                    : "px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded"
                  }>
                    Page {result.page_number}
                  </span>
                </td>
                <td className={tdClass}>#{result.position}</td>
                <td className={tdClass}>
                  {result.is_sponsored ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Sponsored</span>
                  ) : (
                    <span className={isSearchProject 
                      ? "px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded"
                      : "px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    }>Organic</span>
                  )}
                </td>
                <td className={tdClass}>
                  <span className={`px-2 py-1 text-xs rounded ${
                    result.is_active 
                      ? (isSearchProject ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800') 
                      : (isSearchProject ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                  }`}>
                    {result.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={tdClass}>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleEdit(result)} 
                      variant="outline" 
                      size="sm"
                      className={isSearchProject ? "border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" : ""}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => handleDelete(result.id)} 
                      variant="destructive" 
                      size="sm"
                      className={isSearchProject ? "bg-red-600 hover:bg-red-700" : ""}
                    >
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
        <DialogContent className={dialogClass}>
          <DialogHeader>
            <DialogTitle className={isSearchProject ? "text-white" : ""}>
              {editingResult ? 'Edit' : 'Add'} Web Result
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Only show Related Search field for projects that need it */}
            {showRelatedSearchField && (
              <div>
                <Label className={labelClass}>Related Search *</Label>
                <Select
                  value={formData.related_search_id}
                  onValueChange={(value) => setFormData({ ...formData, related_search_id: value })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select related search" />
                  </SelectTrigger>
                  <SelectContent>
                    {relatedSearches.map((search) => (
                      <SelectItem key={search.id} value={search.id}>
                        {search.search_text} ››› WR-{search.web_result_page}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.related_search_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Adding to: <span className="font-medium">
                      {relatedSearches.find(s => s.id === formData.related_search_id)?.search_text}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className={labelClass}>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Best Social Media Platform 2024"
                className={inputClass}
              />
            </div>

            <div>
              <Label className={labelClass}>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of the web result..."
                rows={3}
                className={inputClass}
              />
            </div>

            <div>
              <Label className={labelClass}>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className={inputClass}
              />
              <p className={isSearchProject ? "text-xs text-gray-500 mt-1" : "text-xs text-muted-foreground mt-1"}>
                Optional logo/icon to display with the web result
              </p>
            </div>

            <div>
              <Label className={labelClass}>Target URL *</Label>
              <Input
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                required
                placeholder="https://example.com/page"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Page Number (1-4)</Label>
                <Select
                  value={formData.page_number.toString()}
                  onValueChange={(value) => setFormData({ ...formData, page_number: parseInt(value) })}
                >
                  <SelectTrigger className={inputClass}>
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
                <Label className={labelClass}>Position (1-4)</Label>
                <Select
                  value={formData.position.toString()}
                  onValueChange={(value) => setFormData({ ...formData, position: parseInt(value) })}
                >
                  <SelectTrigger className={inputClass}>
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
              <Label className={labelClass}>Pre-Landing Page Key (optional)</Label>
              <Input
                value={formData.pre_landing_page_key}
                onChange={(e) => setFormData({ ...formData, pre_landing_page_key: e.target.value })}
                placeholder="e.g., wr-1-pos-1"
                className={inputClass}
              />
              <p className={isSearchProject ? "text-xs text-gray-500 mt-1" : "text-xs text-muted-foreground mt-1"}>
                Link to pre-landing page for email capture before redirecting to target URL
              </p>
            </div>

            <div className={`flex items-center gap-4 ${isSearchProject ? 'text-gray-300' : ''}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className={labelClass}>Active</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_sponsored"
                  checked={formData.is_sponsored}
                  onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_sponsored" className={labelClass}>Sponsored Ad</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className={isSearchProject ? "border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" : ""}
              >
                Cancel
              </Button>
              <Button type="submit" className={buttonClass}>
                {editingResult ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
