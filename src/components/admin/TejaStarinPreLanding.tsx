import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, Edit, ChevronRight } from 'lucide-react';
import { tejaStarinClient } from '@/integrations/tejastarin/client';
import { Badge } from '@/components/ui/badge';

interface RelatedSearch {
  id: string;
  search_text: string;
  wr?: number;
  blogs?: { title: string };
}

export const TejaStarinPreLanding = () => {
  const [preLandingPages, setPreLandingPages] = useState<any[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [selectedSearchId, setSelectedSearchId] = useState<string>('');

  const [formData, setFormData] = useState({
    headline: '',
    description: '',
    logo_url: '',
    main_image_url: '',
    background_color: '#ffffff',
    background_image_url: '',
    button_text: 'Visit Now',
    destination_url: '',
    logo_position: 'top-center',
  });

  useEffect(() => {
    fetchPreLandingPages();
    fetchRelatedSearches();
  }, []);

  const fetchPreLandingPages = async () => {
    const { data, error } = await tejaStarinClient
      .from('pre_landing_config')
      .select('*, related_searches(search_text, wr, blogs(title))')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch pre-landing pages');
      return;
    }
    if (data) setPreLandingPages(data);
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
    
    if (!selectedSearchId || !formData.headline) {
      toast.error('Please fill in required fields');
      return;
    }

    const payload = {
      related_search_id: selectedSearchId,
      headline: formData.headline,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      main_image_url: formData.main_image_url || null,
      background_color: formData.background_color || '#ffffff',
      background_image_url: formData.background_image_url || null,
      button_text: formData.button_text || 'Visit Now',
      destination_url: formData.destination_url || null,
      logo_position: formData.logo_position || 'top-center',
    };

    if (editingPage) {
      const { error } = await tejaStarinClient
        .from('pre_landing_config')
        .update(payload)
        .eq('id', editingPage.id);
      
      if (error) {
        toast.error('Failed to update pre-landing page');
      } else {
        toast.success('Pre-landing page updated!');
        setDialogOpen(false);
        setEditingPage(null);
        fetchPreLandingPages();
      }
    } else {
      const { error } = await tejaStarinClient
        .from('pre_landing_config')
        .insert([payload]);
      
      if (error) {
        toast.error('Failed to save pre-landing page');
        console.error(error);
      } else {
        toast.success('Pre-landing page saved!');
        setDialogOpen(false);
        fetchPreLandingPages();
      }
    }
  };

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setSelectedSearchId(page.related_search_id || '');
    setFormData({
      headline: page.headline || '',
      description: page.description || '',
      logo_url: page.logo_url || '',
      main_image_url: page.main_image_url || '',
      background_color: page.background_color || '#ffffff',
      background_image_url: page.background_image_url || '',
      button_text: page.button_text || 'Visit Now',
      destination_url: page.destination_url || '',
      logo_position: page.logo_position || 'top-center',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPage(null);
    setSelectedSearchId('');
    setFormData({
      headline: '',
      description: '',
      logo_url: '',
      main_image_url: '',
      background_color: '#ffffff',
      background_image_url: '',
      button_text: 'Visit Now',
      destination_url: '',
      logo_position: 'top-center',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pre-landing page?')) return;
    
    const { error } = await tejaStarinClient
      .from('pre_landing_config')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete pre-landing page');
    } else {
      toast.success('Pre-landing page deleted');
      fetchPreLandingPages();
    }
  };

  const selectedSearch = relatedSearches.find(s => s.id === selectedSearchId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Pre-Landing Pages</h3>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Pre-Landing Page
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Edit Pre-Landing Page' : 'Add Pre-Landing Page'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Select Related Search */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Select Related Search *</Label>
              <Select value={selectedSearchId} onValueChange={setSelectedSearchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a related search..." />
                </SelectTrigger>
                <SelectContent>
                  {relatedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">RS</Badge>
                        {search.search_text}
                        <Badge variant="secondary" className="text-xs">WR-{search.wr}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hierarchy Display */}
            {selectedSearch && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <Label className="text-sm text-muted-foreground mb-2 block">Selected Path:</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Blog: {selectedSearch.blogs?.title || '-'}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline">RS: {selectedSearch.search_text}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="default">Pre-Landing Page</Badge>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Headline *</Label>
                <Input
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Logo Position</Label>
                <Select value={formData.logo_position} onValueChange={(value) => setFormData({ ...formData, logo_position: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-center">Top Center</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Main Image URL</Label>
                <Input
                  value={formData.main_image_url}
                  onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Button Text</Label>
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
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

            <Button type="submit" className="w-full">
              {editingPage ? 'Update Pre-Landing Page' : 'Save Pre-Landing Page'}
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
                  <th className="text-left p-4">Headline</th>
                  <th className="text-left p-4">Related Search</th>
                  <th className="text-left p-4">Blog</th>
                  <th className="text-left p-4">WR</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preLandingPages.map((page) => (
                  <tr key={page.id} className="border-b">
                    <td className="p-4 font-medium">{page.headline}</td>
                    <td className="p-4">{page.related_searches?.search_text || '-'}</td>
                    <td className="p-4">{page.related_searches?.blogs?.title || '-'}</td>
                    <td className="p-4">
                      {page.related_searches?.wr && (
                        <Badge variant="secondary">WR-{page.related_searches.wr}</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(page)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(page.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preLandingPages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No pre-landing pages found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
