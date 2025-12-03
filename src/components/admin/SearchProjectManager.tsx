import { useState, useEffect } from 'react';
import { searchProjectClient } from '@/integrations/searchproject/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Trash2, Edit2, Plus, Save, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelatedSearchManager } from './RelatedSearchManager';
import { PreLandingEditor } from './PreLandingEditor';
import { EmailCaptureViewer } from './EmailCaptureViewer';

interface WebResult {
  id: string;
  webresult_page: string;
  is_sponsored: boolean;
  offer_name: string | null;
  title: string;
  description: string;
  original_link: string;
  logo_url: string | null;
  serial_number: number;
  imported_from: string | null;
  access_type: string;
  allowed_countries: string[];
  backlink_url: string | null;
}

interface LandingPage {
  id: string;
  title: string;
  description: string;
}

interface EmailCapture {
  id: string;
  email: string;
  web_result_id: string | null;
  session_id: string | null;
  ip_address: string | null;
  country: string | null;
  device: string | null;
  captured_at: string;
  redirected_to: string | null;
}

export function SearchProjectManager() {
  const [activeTab, setActiveTab] = useState('webresults');
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [emailCaptures, setEmailCaptures] = useState<EmailCapture[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (activeTab === 'webresults') fetchWebResults();
    if (activeTab === 'landing') fetchLandingPages();
  }, [activeTab]);

  const fetchWebResults = async () => {
    const { data, error } = await searchProjectClient
      .from('web_results')
      .select('*')
      .order('serial_number', { ascending: true });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setWebResults(data || []);
    }
  };

  const fetchLandingPages = async () => {
    const { data, error } = await searchProjectClient
      .from('landing_page')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLandingPages(data || []);
    }
  };


  const handleSaveWebResult = async () => {
    const data = {
      ...formData,
      serial_number: parseInt(formData.serial_number || '0'),
      allowed_countries: Array.isArray(formData.allowed_countries) 
        ? formData.allowed_countries 
        : (formData.allowed_countries || '').split(',').map((c: string) => c.trim()).filter(Boolean),
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
        setEditingId(null);
        setFormData({});
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
        setFormData({});
        fetchWebResults();
      }
    }
  };

  const handleSaveLandingPage = async () => {
    if (editingId) {
      const { error } = await searchProjectClient
        .from('landing_page')
        .update(formData)
        .eq('id', editingId);
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Landing page updated' });
        setEditingId(null);
        setFormData({});
        fetchLandingPages();
      }
    } else {
      const { error } = await searchProjectClient
        .from('landing_page')
        .insert([formData]);
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Landing page created' });
        setFormData({});
        fetchLandingPages();
      }
    }
  };

  const handleDeleteWebResult = async (id: string) => {
    const { error } = await searchProjectClient
      .from('web_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Web result deleted' });
      fetchWebResults();
    }
  };

  const handleDeleteLandingPage = async (id: string) => {
    const { error } = await searchProjectClient
      .from('landing_page')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Landing page deleted' });
      fetchLandingPages();
    }
  };

  const startEdit = (item: any, type: string) => {
    setEditingId(item.id);
    if (type === 'webresult') {
      setFormData({
        ...item,
        allowed_countries: Array.isArray(item.allowed_countries) 
          ? item.allowed_countries.join(', ') 
          : item.allowed_countries || '',
      });
    } else {
      setFormData(item);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  return (
    <div className="space-y-6 bg-[#0a1628] min-h-screen p-6 rounded-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1a2942] border border-[#2a3f5f]">
          <TabsTrigger value="webresults" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-gray-300">Web Results</TabsTrigger>
          <TabsTrigger value="searches" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-gray-300">Related Searches</TabsTrigger>
          <TabsTrigger value="landing" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-gray-300">Landing Pages</TabsTrigger>
          <TabsTrigger value="prelanding" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-gray-300">Pre-Landing</TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-gray-300">Email Captures</TabsTrigger>
        </TabsList>

        <TabsContent value="webresults" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Edit' : 'Add'} Web Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Webresult Page"
                value={formData.webresult_page || ''}
                onChange={(e) => setFormData({ ...formData, webresult_page: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
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
                type="number"
                placeholder="Serial Number"
                value={formData.serial_number || ''}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Offer Name"
                value={formData.offer_name || ''}
                onChange={(e) => setFormData({ ...formData, offer_name: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Backlink URL"
                value={formData.backlink_url || ''}
                onChange={(e) => setFormData({ ...formData, backlink_url: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <Select
                value={formData.access_type || 'worldwide'}
                onValueChange={(value) => setFormData({ ...formData, access_type: value })}
              >
                <SelectTrigger className="bg-[#0a1628] border-[#2a3f5f] text-white">
                  <SelectValue placeholder="Access Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2942] border-[#2a3f5f]">
                  <SelectItem value="worldwide" className="text-white hover:bg-[#2a3f5f]">Worldwide</SelectItem>
                  <SelectItem value="restricted" className="text-white hover:bg-[#2a3f5f]">Restricted</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Allowed Countries (comma separated, e.g., US, UK, CA)"
                value={formData.allowed_countries || ''}
                onChange={(e) => setFormData({ ...formData, allowed_countries: e.target.value })}
                className="bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.is_sponsored || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_sponsored: checked })}
                  className="border-[#2a3f5f] data-[state=checked]:bg-[#3b82f6]"
                />
                <label className="text-sm text-gray-300">Is Sponsored</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveWebResult} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {editingId ? <><Save className="h-4 w-4 mr-2" /> Update</> : <><Plus className="h-4 w-4 mr-2" /> Create</>}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={cancelEdit} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {webResults.map((result) => (
              <Card key={result.id} className="bg-[#1a2942] border-[#2a3f5f]">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{result.serial_number}. {result.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{result.description}</p>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <p><strong className="text-gray-400">Page:</strong> {result.webresult_page}</p>
                        <p><strong className="text-gray-400">Link:</strong> {result.original_link}</p>
                        {result.is_sponsored && <p className="text-yellow-500">★ Sponsored</p>}
                        {result.offer_name && <p><strong className="text-gray-400">Offer:</strong> {result.offer_name}</p>}
                        <p><strong className="text-gray-400">Access:</strong> {result.access_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(result, 'webresult')} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteWebResult(result.id)} className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="landing" className="space-y-4">
          <Card className="bg-[#1a2942] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? 'Edit' : 'Add'} Landing Page</CardTitle>
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
              <div className="flex gap-2">
                <Button onClick={handleSaveLandingPage} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {editingId ? <><Save className="h-4 w-4 mr-2" /> Update</> : <><Plus className="h-4 w-4 mr-2" /> Create</>}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={cancelEdit} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {landingPages.map((page) => (
              <Card key={page.id} className="bg-[#1a2942] border-[#2a3f5f]">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{page.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{page.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(page, 'landing')} className="border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteLandingPage(page.id)} className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="searches">
          <RelatedSearchManager projectClient={searchProjectClient} projectName="SearchProject" />
        </TabsContent>

        <TabsContent value="prelanding">
          <PreLandingEditor projectClient={searchProjectClient} projectName="SearchProject" />
        </TabsContent>

        <TabsContent value="emails">
          <EmailCaptureViewer projectClient={searchProjectClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
