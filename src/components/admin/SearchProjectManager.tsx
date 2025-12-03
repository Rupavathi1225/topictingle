import { useState, useEffect } from 'react';
import { searchProjectClient } from '@/integrations/searchproject/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Trash2, Edit2, Plus, Save, X, Search, Globe, FileText, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface LandingSettings {
  id: string;
  site_name: string;
  title: string;
  description: string;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  title: string;
  web_result_page: number;
  position: number;
  display_order: number;
  is_active: boolean;
}

interface WebResult {
  id: string;
  web_result_page: number;
  title: string;
  description: string | null;
  logo_url: string | null;
  original_link: string;
  display_order: number;
  is_active: boolean;
  country_permissions: string[];
  fallback_link: string | null;
}

interface PrelanderSettings {
  id: string;
  related_search_id: string | null;
  logo_url: string | null;
  logo_position: string;
  logo_size: number;
  headline: string;
  description: string | null;
  headline_color: string;
  description_color: string;
  headline_font_size: number;
  description_font_size: number;
  main_image_url: string | null;
  background_color: string;
  background_image_url: string | null;
  button_text: string;
  button_color: string;
  button_text_color: string;
  target_url: string;
  is_active: boolean;
}

export function SearchProjectManager() {
  const [activeTab, setActiveTab] = useState('landing');
  const [landing, setLanding] = useState<LandingSettings | null>(null);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [prelanders, setPrelanders] = useState<PrelanderSettings[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    fetchLanding();
    fetchSearches();
    fetchWebResults();
    fetchPrelanders();
  };

  const fetchLanding = async () => {
    const { data, error } = await searchProjectClient
      .from('landing_settings')
      .select('*')
      .limit(1)
      .single();
    if (!error && data) setLanding(data);
  };

  const fetchSearches = async () => {
    const { data, error } = await searchProjectClient
      .from('related_searches')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error) setSearches(data || []);
  };

  const fetchWebResults = async () => {
    const { data, error } = await searchProjectClient
      .from('web_results')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error) setWebResults(data || []);
  };

  const fetchPrelanders = async () => {
    const { data, error } = await searchProjectClient
      .from('prelander_settings')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setPrelanders(data || []);
  };

  const handleSaveLanding = async () => {
    if (landing?.id) {
      const { error } = await searchProjectClient
        .from('landing_settings')
        .update(formData)
        .eq('id', landing.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Landing settings updated' });
        fetchLanding();
        setFormData({});
      }
    }
  };

  const handleSaveSearch = async () => {
    const data = {
      ...formData,
      web_result_page: parseInt(formData.web_result_page || '1'),
      position: parseInt(formData.position || '1'),
      display_order: parseInt(formData.display_order || '0'),
    };

    if (editingId) {
      const { error } = await searchProjectClient
        .from('related_searches')
        .update(data)
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Related search updated' });
        resetForm();
        fetchSearches();
      }
    } else {
      const { error } = await searchProjectClient
        .from('related_searches')
        .insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Related search created' });
        resetForm();
        fetchSearches();
      }
    }
  };

  const handleSaveWebResult = async () => {
    const data = {
      ...formData,
      web_result_page: parseInt(formData.web_result_page || '1'),
      display_order: parseInt(formData.display_order || '0'),
      country_permissions: formData.country_permissions?.split(',').map((c: string) => c.trim()) || ['worldwide'],
    };

    if (editingId) {
      const { error } = await searchProjectClient
        .from('web_results')
        .update(data)
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Web result updated' });
        resetForm();
        fetchWebResults();
      }
    } else {
      const { error } = await searchProjectClient
        .from('web_results')
        .insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Web result created' });
        resetForm();
        fetchWebResults();
      }
    }
  };

  const handleSavePrelander = async () => {
    const data = {
      ...formData,
      logo_size: parseInt(formData.logo_size || '100'),
      headline_font_size: parseInt(formData.headline_font_size || '32'),
      description_font_size: parseInt(formData.description_font_size || '16'),
    };

    if (editingId) {
      const { error } = await searchProjectClient
        .from('prelander_settings')
        .update(data)
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Prelander updated' });
        resetForm();
        fetchPrelanders();
      }
    } else {
      const { error } = await searchProjectClient
        .from('prelander_settings')
        .insert([data]);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Prelander created' });
        resetForm();
        fetchPrelanders();
      }
    }
  };

  const handleDelete = async (table: string, id: string) => {
    const { error } = await searchProjectClient.from(table).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Item deleted' });
      fetchAll();
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      ...item,
      country_permissions: Array.isArray(item.country_permissions) 
        ? item.country_permissions.join(', ') 
        : item.country_permissions || '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({});
  };

  return (
    <div className="space-y-6 bg-[#0a1628] min-h-screen p-6 rounded-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1a2942] border border-[#2a3f5f]">
          <TabsTrigger value="landing" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">
            <Globe className="w-4 h-4 mr-2" /> Landing
          </TabsTrigger>
          <TabsTrigger value="searches" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">
            <Search className="w-4 h-4 mr-2" /> Related Searches
          </TabsTrigger>
          <TabsTrigger value="webresults" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">
            <FileText className="w-4 h-4 mr-2" /> Web Results
          </TabsTrigger>
          <TabsTrigger value="prelanders" className="data-[state=active]:bg-[#00b4d8] data-[state=active]:text-white text-gray-300">
            <Mail className="w-4 h-4 mr-2" /> Prelanders
          </TabsTrigger>
        </TabsList>

        {/* Landing Settings */}
        <TabsContent value="landing" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">Landing Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Site Name</Label>
                <Input
                  value={formData.site_name || landing?.site_name || ''}
                  onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Title</Label>
                <Input
                  value={formData.title || landing?.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={formData.description || landing?.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white"
                />
              </div>
              <Button onClick={handleSaveLanding} className="bg-[#00b4d8] hover:bg-[#0096c7] text-white">
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Searches */}
        <TabsContent value="searches" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Edit' : 'Add'} Related Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search Text"
                value={formData.search_text || ''}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="Web Result Page"
                  value={formData.web_result_page || ''}
                  onChange={(e) => setFormData({ ...formData, web_result_page: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  type="number"
                  placeholder="Position"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  type="number"
                  placeholder="Display Order"
                  value={formData.display_order || ''}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-gray-300">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSearch} className="bg-[#00b4d8] hover:bg-[#0096c7] text-white">
                  {editingId ? <><Save className="w-4 h-4 mr-2" /> Update</> : <><Plus className="w-4 h-4 mr-2" /> Create</>}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {searches.map((search) => (
              <Card key={search.id} className="bg-[#1a2942] border-[#2a3f5f]">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">{search.title}</h3>
                      <p className="text-sm text-gray-400">{search.search_text}</p>
                      <p className="text-xs text-gray-500 mt-1">Page: {search.web_result_page} | Position: {search.position} | Order: {search.display_order}</p>
                      <span className={`text-xs px-2 py-1 rounded ${search.is_active ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                        {search.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(search)} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete('related_searches', search.id)} className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Web Results */}
        <TabsContent value="webresults" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Edit' : 'Add'} Web Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Textarea
                placeholder="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Original Link"
                value={formData.original_link || ''}
                onChange={(e) => setFormData({ ...formData, original_link: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Logo URL"
                value={formData.logo_url || ''}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Fallback Link"
                value={formData.fallback_link || ''}
                onChange={(e) => setFormData({ ...formData, fallback_link: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Web Result Page"
                  value={formData.web_result_page || ''}
                  onChange={(e) => setFormData({ ...formData, web_result_page: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  type="number"
                  placeholder="Display Order"
                  value={formData.display_order || ''}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
              </div>
              <Input
                placeholder="Country Permissions (comma separated, e.g., US, UK, worldwide)"
                value={formData.country_permissions || ''}
                onChange={(e) => setFormData({ ...formData, country_permissions: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-gray-300">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveWebResult} className="bg-[#00b4d8] hover:bg-[#0096c7] text-white">
                  {editingId ? <><Save className="w-4 h-4 mr-2" /> Update</> : <><Plus className="w-4 h-4 mr-2" /> Create</>}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {webResults.map((result) => (
              <Card key={result.id} className="bg-[#1a2942] border-[#2a3f5f]">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      {result.logo_url && (
                        <img src={result.logo_url} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{result.title}</h3>
                        <p className="text-sm text-gray-400">{result.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Page: {result.web_result_page} | Order: {result.display_order}</p>
                        <span className={`text-xs px-2 py-1 rounded ${result.is_active ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                          {result.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(result)} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete('web_results', result.id)} className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Prelanders */}
        <TabsContent value="prelanders" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Edit' : 'Add'} Prelander</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Headline"
                value={formData.headline || ''}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Textarea
                placeholder="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Target URL"
                value={formData.target_url || ''}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Logo URL"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Main Image URL"
                  value={formData.main_image_url || ''}
                  onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Button Text"
                  value={formData.button_text || 'Continue'}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Button Color"
                  value={formData.button_color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Background Color"
                  value={formData.background_color || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-gray-300">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSavePrelander} className="bg-[#00b4d8] hover:bg-[#0096c7] text-white">
                  {editingId ? <><Save className="w-4 h-4 mr-2" /> Update</> : <><Plus className="w-4 h-4 mr-2" /> Create</>}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {prelanders.map((prelander) => (
              <Card key={prelander.id} className="bg-[#1a2942] border-[#2a3f5f]">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">{prelander.headline}</h3>
                      <p className="text-sm text-gray-400">{prelander.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Target: {prelander.target_url}</p>
                      <span className={`text-xs px-2 py-1 rounded ${prelander.is_active ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                        {prelander.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(prelander)} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete('prelander_settings', prelander.id)} className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
