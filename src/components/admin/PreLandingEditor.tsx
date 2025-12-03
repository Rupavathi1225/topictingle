import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WebResult {
  id: string;
  title: string;
  description: string | null;
  target_url: string;
  page_number: number;
  position: number;
  pre_landing_page_key: string | null;
}

interface PreLandingPage {
  id?: string;
  page_key: string;
  logo_url: string;
  main_image_url: string;
  headline: string;
  description: string;
  cta_text: string;
  background_color: string;
  background_image_url: string;
  target_url: string;
}

interface PreLandingEditorProps {
  projectClient: any;
  projectName: string;
}

export const PreLandingEditor = ({ projectClient, projectName }: PreLandingEditorProps) => {
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [selectedWebResultId, setSelectedWebResultId] = useState<string>('');
  const [selectedWebResult, setSelectedWebResult] = useState<WebResult | null>(null);
  const [formData, setFormData] = useState<PreLandingPage>({
    page_key: '',
    logo_url: '',
    main_image_url: '',
    headline: 'Your amazing deal is here',
    description: 'Describe what users will get...',
    cta_text: 'Get Started',
    background_color: '#ffffff',
    background_image_url: '',
    target_url: '',
  });
  const [emailPlaceholder, setEmailPlaceholder] = useState('Enter your email');

  const isSearchProject = projectName === 'SearchProject';

  useEffect(() => {
    fetchWebResults();
  }, []);

  useEffect(() => {
    if (selectedWebResultId) {
      const webResult = webResults.find(w => w.id === selectedWebResultId);
      if (webResult) {
        setSelectedWebResult(webResult);
        if (webResult.pre_landing_page_key) {
          loadPreLandingPage(webResult.pre_landing_page_key);
        } else {
          // Generate new page key based on web result
          const newPageKey = `${projectName.toLowerCase()}-wr${webResult.page_number}-pos${webResult.position}`;
          setFormData({
            page_key: newPageKey,
            logo_url: '',
            main_image_url: '',
            headline: webResult.title || 'Your amazing deal is here',
            description: 'Describe what users will get...',
            cta_text: 'Get Started',
            background_color: '#ffffff',
            background_image_url: '',
            target_url: webResult.target_url || '',
          });
        }
      }
    }
  }, [selectedWebResultId, webResults]);

  const fetchWebResults = async () => {
    try {
      const { data, error } = await projectClient
        .from('web_results')
        .select('*')
        .order('page_number', { ascending: true })
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching web results:', error);
        toast.error('Failed to fetch web results. Please check the database setup.');
        return;
      }
      
      if (data && data.length > 0) {
        setWebResults(data);
      } else {
        toast.info('No web results found. Please create some first in the Web Results tab.');
      }
    } catch (err: any) {
      console.error('Error:', err);
      toast.error('Failed to connect to database: ' + err.message);
    }
  };

  const loadPreLandingPage = async (pageKey: string) => {
    const { data, error } = await projectClient
      .from('pre_landing_pages')
      .select('*')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (data) {
      setFormData({
        id: data.id,
        page_key: data.page_key,
        logo_url: data.logo_url || '',
        main_image_url: data.main_image_url || '',
        headline: data.headline,
        description: data.description || '',
        cta_text: data.cta_text,
        background_color: data.background_color,
        background_image_url: data.background_image_url || '',
        target_url: data.target_url,
      });
    }
  };

  const handleUpdatePreLanding = async () => {
    if (!selectedWebResult) {
      toast.error('Please select a web result');
      return;
    }

    if (!formData.target_url) {
      toast.error('Please enter a target URL');
      return;
    }

    try {
      // Check if page exists
      const { data: existing } = await projectClient
        .from('pre_landing_pages')
        .select('id')
        .eq('page_key', formData.page_key)
        .maybeSingle();

      const pageData = {
        page_key: formData.page_key,
        logo_url: formData.logo_url,
        main_image_url: formData.main_image_url,
        headline: formData.headline,
        description: formData.description,
        cta_text: formData.cta_text,
        background_color: formData.background_color,
        background_image_url: formData.background_image_url,
        target_url: formData.target_url,
        is_active: true,
      };

      if (existing) {
        // Update existing
        const { error } = await projectClient
          .from('pre_landing_pages')
          .update(pageData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await projectClient
          .from('pre_landing_pages')
          .insert([pageData]);

        if (error) throw error;
      }

      // Update web result to link to this prelanding page
      const { error: webResultError } = await projectClient
        .from('web_results')
        .update({ pre_landing_page_key: formData.page_key })
        .eq('id', selectedWebResult.id);

      if (webResultError) throw webResultError;

      toast.success('Pre-landing page updated successfully!');
      fetchWebResults();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  // Conditional styling for SearchProject dark theme
  const containerClass = isSearchProject 
    ? "space-y-6 bg-[#0a1628] min-h-screen p-6 rounded-lg" 
    : "space-y-6";

  const cardClass = isSearchProject
    ? "bg-[#1a2942] border-[#2a3f5f]"
    : "";

  const titleClass = isSearchProject
    ? "text-white"
    : "";

  const labelClass = isSearchProject
    ? "text-gray-300"
    : "";

  const inputClass = isSearchProject
    ? "bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
    : "";

  const buttonClass = isSearchProject
    ? "bg-[#00b4d8] hover:bg-[#0096c7] text-white w-full"
    : "w-full";

  return (
    <div className={containerClass}>
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className={titleClass}>Pre-Landing Page Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Select Web Result */}
          <div>
            <Label className={`text-base font-semibold ${labelClass}`}>Select Web Result</Label>
            <Select value={selectedWebResultId} onValueChange={setSelectedWebResultId}>
              <SelectTrigger className={`mt-2 ${inputClass}`}>
                <SelectValue placeholder="Choose a web result" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                {webResults.length === 0 ? (
                  <SelectItem value="no-results" disabled>
                    No web results found - create some first
                  </SelectItem>
                ) : (
                  webResults.map((webResult) => (
                    <SelectItem key={webResult.id} value={webResult.id}>
                      {webResult.title} (Page {webResult.page_number}, Pos {webResult.position})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedWebResult && (
            <div className={`space-y-4 border-t pt-6 ${isSearchProject ? 'border-[#2a3f5f]' : ''}`}>
              <h3 className={`text-lg font-semibold ${titleClass}`}>Edit Pre-Landing Page</h3>

              <div>
                <Label className={labelClass}>Logo URL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Main Image URL</Label>
                <Input
                  value={formData.main_image_url}
                  onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                  placeholder="https://example.com/main-image.jpg"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Headline</Label>
                <Input
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Your amazing deal is here"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what users will get..."
                  rows={4}
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Email Placeholder</Label>
                <Input
                  value={emailPlaceholder}
                  onChange={(e) => setEmailPlaceholder(e.target.value)}
                  placeholder="Enter your email"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>CTA Button Text</Label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="Get Started"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Background Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#ffffff"
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <Label className={labelClass}>Background Image URL (optional)</Label>
                <Input
                  value={formData.background_image_url}
                  onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                  placeholder="https://example.com/background.jpg"
                  className={inputClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Target URL (where to redirect after email capture)</Label>
                <Input
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://example.com"
                  required
                  className={inputClass}
                />
              </div>

              <Button 
                onClick={handleUpdatePreLanding}
                className={buttonClass}
                size="lg"
              >
                Update Pre-Landing Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
