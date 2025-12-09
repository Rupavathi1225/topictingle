import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Plus, Pencil, ChevronRight } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';

interface RelatedSearch {
  id: string;
  search_text: string;
  wr?: number;
  blog_id?: string;
  blogs?: {
    title: string;
  } | { title: string }[];
}

interface WebResult {
  id: string;
  title: string;
  url: string;
  related_search_id: string;
  order_index: number;
}

interface PreLandingConfig {
  id: string;
  related_search_id: string;
  logo_url: string | null;
  logo_position: string;
  main_image_url: string | null;
  headline: string | null;
  description: string | null;
  background_color: string;
  background_image_url: string | null;
  button_text: string;
  destination_url: string | null;
}

export const TejaStarinPreLanding = () => {
  const [preLandingConfigs, setPreLandingConfigs] = useState<PreLandingConfig[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PreLandingConfig | null>(null);
  
  const [formData, setFormData] = useState({
    related_search_id: '',
    logo_url: '',
    logo_position: 'top-center',
    main_image_url: '',
    headline: '',
    description: '',
    background_color: '#ffffff',
    background_image_url: '',
    button_text: 'Visit Now',
    destination_url: '',
  });

  useEffect(() => {
    fetchPreLandingConfigs();
    fetchRelatedSearches();
    fetchWebResults();
  }, []);

  const fetchPreLandingConfigs = async () => {
    const { data, error } = await tejaStarinClient
      .from('pre_landing_config')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch pre-landing configs');
      console.error(error);
      return;
    }
    if (data) setPreLandingConfigs(data);
  };

  const fetchRelatedSearches = async () => {
    const { data, error } = await tejaStarinClient
      .from('related_searches')
      .select('id, search_text, wr, blog_id, blogs(title)')
      .order('blog_id, wr');
    
    if (error) {
      toast.error('Failed to fetch related searches');
      console.error(error);
      return;
    }
    if (data) setRelatedSearches(data);
  };

  const fetchWebResults = async () => {
    const { data, error } = await tejaStarinClient
      .from('web_results')
      .select('id, title, url, related_search_id, order_index')
      .order('related_search_id, order_index');
    
    if (error) {
      console.error('Failed to fetch web results:', error);
      return;
    }
    if (data) setWebResults(data);
  };

  const getSearchDisplayText = (searchId: string) => {
    const search = relatedSearches.find(s => s.id === searchId);
    if (!search) return searchId;
    
    const blogTitle = Array.isArray(search.blogs) 
      ? search.blogs[0]?.title || 'Unknown Blog'
      : search.blogs?.title || 'Unknown Blog';
    const searchResults = webResults.filter(wr => wr.related_search_id === searchId);
    
    let display = `${blogTitle} >> [Related Search: ${search.search_text}]`;
    if (searchResults.length > 0) {
      const resultTitles = searchResults.map(r => r.title).join(', ');
      display += ` >> [Web Results: ${resultTitles}]`;
    }
    return display;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.related_search_id) {
      toast.error('Please select a related search');
      return;
    }

    const payload = {
      related_search_id: formData.related_search_id,
      logo_url: formData.logo_url || null,
      logo_position: formData.logo_position,
      main_image_url: formData.main_image_url || null,
      headline: formData.headline || null,
      description: formData.description || null,
      background_color: formData.background_color,
      background_image_url: formData.background_image_url || null,
      button_text: formData.button_text || 'Visit Now',
      destination_url: formData.destination_url || null,
    };

    if (editingConfig) {
      const { error } = await tejaStarinClient
        .from('pre_landing_config')
        .update(payload)
        .eq('id', editingConfig.id);
      
      if (error) {
        toast.error('Error updating config');
        console.error(error);
      } else {
        toast.success('Config updated successfully');
        resetForm();
        fetchPreLandingConfigs();
      }
    } else {
      const { error } = await tejaStarinClient
        .from('pre_landing_config')
        .insert([payload]);
      
      if (error) {
        toast.error('Error creating config');
        console.error(error);
      } else {
        toast.success('Config created successfully');
        resetForm();
        fetchPreLandingConfigs();
      }
    }
  };

  const handleEdit = (config: PreLandingConfig) => {
    setEditingConfig(config);
    setFormData({
      related_search_id: config.related_search_id,
      logo_url: config.logo_url || '',
      logo_position: config.logo_position,
      main_image_url: config.main_image_url || '',
      headline: config.headline || '',
      description: config.description || '',
      background_color: config.background_color,
      background_image_url: config.background_image_url || '',
      button_text: config.button_text,
      destination_url: config.destination_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pre-landing config?')) return;
    
    const { error } = await tejaStarinClient
      .from('pre_landing_config')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete pre-landing config');
      console.error(error);
    } else {
      toast.success('Pre-landing config deleted');
      fetchPreLandingConfigs();
    }
  };

  const resetForm = () => {
    setFormData({
      related_search_id: '',
      logo_url: '',
      logo_position: 'top-center',
      main_image_url: '',
      headline: '',
      description: '',
      background_color: '#ffffff',
      background_image_url: '',
      button_text: 'Visit Now',
      destination_url: '',
    });
    setEditingConfig(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Pre-Landing Pages</h3>
        <Button onClick={() => {
          if (showForm) {
            resetForm();
          } else {
            setShowForm(true);
          }
        }}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'New Config'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingConfig ? 'Edit Config' : 'Create New Config'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="md:col-span-2">
                <Label>Related Search *</Label>
                <Select 
                  value={formData.related_search_id} 
                  onValueChange={(value) => setFormData({ ...formData, related_search_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select search" />
                  </SelectTrigger>
                  <SelectContent>
                    {relatedSearches.map((search) => {
                      const searchResults = webResults.filter(wr => wr.related_search_id === search.id);
                      const blogTitle = Array.isArray(search.blogs) 
                        ? search.blogs[0]?.title || 'Unknown Blog'
                        : search.blogs?.title || 'Unknown Blog';
                      
                      let displayText = `${blogTitle} >> [Related Search: ${search.search_text}]`;
                      if (searchResults.length > 0) {
                        const resultTitles = searchResults.map(r => r.title).join(', ');
                        displayText += ` >> [Web Results: ${resultTitles}]`;
                      }
                      
                      return (
                        <SelectItem key={search.id} value={search.id}>
                          {displayText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>Logo Position</Label>
                  <Select 
                    value={formData.logo_position} 
                    onValueChange={(value) => setFormData({ ...formData, logo_position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Main Image URL</Label>
                  <Input
                    value={formData.main_image_url}
                    onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Background Image URL</Label>
                <Input
                  value={formData.background_image_url}
                  onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Headline</Label>
                <Input
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Enter headline"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Enter description"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    placeholder="Visit Now"
                  />
                </div>

                <div>
                  <Label>Destination URL</Label>
                  <Input
                    value={formData.destination_url}
                    onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit">{editingConfig ? 'Update' : 'Create'} Config</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
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
                  <th className="text-left p-4">Blog › Related Search</th>
                  <th className="text-left p-4">Headline</th>
                  <th className="text-left p-4">Button Text</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preLandingConfigs.map((config) => (
                  <tr key={config.id} className="border-b">
                    <td className="p-4">{getSearchDisplayText(config.related_search_id)}</td>
                    <td className="p-4">{config.headline}</td>
                    <td className="p-4">{config.button_text}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(config.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preLandingConfigs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No pre-landing configs found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
