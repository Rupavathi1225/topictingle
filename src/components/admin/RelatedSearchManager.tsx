import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { BulkActionToolbar } from './BulkActionToolbar';

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  position: number;
  is_active: boolean;
  display_order: number;
  allowed_countries: string[];
}

interface Blog {
  id: string;
  title: string;
}

interface RelatedSearchManagerProps {
  projectClient: any;
  categoryId?: number;
  projectName?: string;
}

export const RelatedSearchManager = ({ projectClient, categoryId, projectName }: RelatedSearchManagerProps) => {
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    blog_id: '',
    title: '',
    search_text: '',
    web_result_page: 1,
    position: 1,
    is_active: true,
    display_order: 0,
    allowed_countries: ['WW'],
  });

  // Check if project needs blogs (SearchProject doesn't have blogs)
  const isSearchProject = projectName === 'SearchProject';
  const isDataOrbitZone = projectName === 'DataOrbitZone';
  const needsBlogs = !isSearchProject && !isDataOrbitZone;

  useEffect(() => {
    fetchSearches();
    if (needsBlogs) {
      fetchBlogs();
    }
  }, [categoryId, needsBlogs]);

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

  const fetchSearches = async () => {
    try {
      let query = projectClient.from('related_searches').select('*');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching related searches:', error);
        toast.error('Failed to load related searches');
        return;
      }

      if (data) setSearches(data);
    } catch (err: any) {
      console.error('Unexpected error fetching related searches:', err);
      toast.error('Failed to load related searches');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require blog_id for projects that need blogs
    if (needsBlogs && !formData.blog_id) {
      toast.error('Please select a blog');
      return;
    }
    
    const basePayload: any = {
      title: formData.title,
      search_text: formData.search_text,
      web_result_page: formData.web_result_page,
      position: formData.position,
    };

    const payload = {
      ...basePayload,
      ...(formData.blog_id && needsBlogs && { blog_id: formData.blog_id }),
      ...(categoryId && { category_id: categoryId }),
      ...(projectName === 'TopicMingle' && {
        is_active: formData.is_active,
        display_order: formData.display_order,
        allowed_countries: formData.allowed_countries,
      }),
      // For SearchProject, include display_order and is_active
      ...(isSearchProject && {
        display_order: formData.display_order,
        is_active: formData.is_active,
      }),
    };

    if (editingSearch) {
      const { error } = await projectClient
        .from('related_searches')
        .update(payload)
        .eq('id', editingSearch.id);
      
      if (error) {
        console.error('Failed to update search:', error);
        toast.error('Failed to update search');
      } else {
        toast.success('Search updated successfully');
        setDialogOpen(false);
        setEditingSearch(null);
        fetchSearches();
      }
    } else {
      const { error } = await projectClient
        .from('related_searches')
        .insert([payload]);
      
      if (error) {
        console.error('Failed to create search:', error);
        toast.error('Failed to create search');
      } else {
        toast.success('Search created successfully');
        setDialogOpen(false);
        fetchSearches();
      }
    }
  };

  const handleEdit = (search: RelatedSearch) => {
    setEditingSearch(search);
    setFormData({
      blog_id: (search as any).blog_id || '',
      title: search.title || '',
      search_text: search.search_text,
      web_result_page: search.web_result_page,
      position: search.position,
      is_active: search.is_active,
      display_order: search.display_order,
      allowed_countries: search.allowed_countries || ['WW'],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    
    const { error } = await projectClient.from('related_searches').delete().eq('id', id);
    
    if (error) {
      toast.error('Failed to delete search');
    } else {
      toast.success('Search deleted successfully');
      fetchSearches();
    }
  };

  const resetForm = () => {
    setFormData({
      blog_id: '',
      title: '',
      search_text: '',
      web_result_page: 1,
      position: 1,
      is_active: true,
      display_order: 0,
      allowed_countries: ['WW'],
    });
    setEditingSearch(null);
  };

  // Bulk selection handlers
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
    if (selectedItems.size === searches.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(searches.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected search(es)?`)) return;
    
    for (const id of selectedItems) {
      await projectClient.from('related_searches').delete().eq('id', id);
    }
    toast.success(`Deleted ${selectedItems.size} search(es)`);
    setSelectedItems(new Set());
    fetchSearches();
  };

  const handleBulkActivate = async () => {
    if (selectedItems.size === 0) return;
    for (const id of selectedItems) {
      await projectClient.from('related_searches').update({ is_active: true }).eq('id', id);
    }
    toast.success(`Activated ${selectedItems.size} search(es)`);
    setSelectedItems(new Set());
    fetchSearches();
  };

  const handleBulkDeactivate = async () => {
    if (selectedItems.size === 0) return;
    for (const id of selectedItems) {
      await projectClient.from('related_searches').update({ is_active: false }).eq('id', id);
    }
    toast.success(`Deactivated ${selectedItems.size} search(es)`);
    setSelectedItems(new Set());
    fetchSearches();
  };

  // Apply dark theme for SearchProject
  const containerClass = isSearchProject 
    ? "space-y-4 bg-[#0a1628] min-h-screen p-6 rounded-lg" 
    : "space-y-4";
  
  const headerClass = isSearchProject
    ? "text-lg font-semibold text-white"
    : "text-lg font-semibold";
  
  const cardClass = isSearchProject
    ? "flex items-center gap-3 p-4 bg-[#1a2942] rounded-lg border border-[#2a3f5f]"
    : "flex items-center gap-3 p-4 bg-card rounded-lg border";
  
  const titleClass = isSearchProject
    ? "font-medium text-white"
    : "font-medium";
  
  const subtitleClass = isSearchProject
    ? "text-sm text-gray-400"
    : "text-sm text-muted-foreground";
  
  const buttonClass = isSearchProject
    ? "bg-[#00b4d8] hover:bg-[#0096c7] text-white"
    : "";

  const dialogClass = isSearchProject
    ? "max-w-2xl bg-[#1a2942] border-[#2a3f5f]"
    : "max-w-2xl";

  const inputClass = isSearchProject
    ? "bg-[#0a1628] border-[#2a3f5f] text-white placeholder:text-gray-500"
    : "";

  const labelClass = isSearchProject
    ? "text-gray-300"
    : "";

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center">
        <h3 className={headerClass}>Related Searches</h3>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className={buttonClass}
        >
          Add Related Search
        </Button>
      </div>

      <BulkActionToolbar
        selectedCount={selectedItems.size}
        totalCount={searches.length}
        onSelectAll={handleSelectAll}
        onDelete={handleBulkDelete}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        isAllSelected={selectedItems.size === searches.length && searches.length > 0}
        isDarkTheme={isSearchProject}
        selectedData={searches.filter(s => selectedItems.has(s.id))}
        allData={searches}
        csvColumns={['id', 'title', 'search_text', 'web_result_page', 'position', 'is_active', 'display_order']}
        csvFilename={`${projectName || 'related'}_searches`}
      />

      <div className="space-y-2">
        {searches.map((search) => (
          <div key={search.id} className={cardClass}>
            <Checkbox
              checked={selectedItems.has(search.id)}
              onCheckedChange={() => toggleSelection(search.id)}
              className={isSearchProject ? "border-gray-500" : ""}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={titleClass}>{search.title || search.search_text}</p>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  search.is_active 
                    ? (isSearchProject ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800') 
                    : (isSearchProject ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                }`}>
                  {search.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className={subtitleClass}>
                {needsBlogs && (search as any).blogs?.title && <span className="text-primary font-medium">Blog: {(search as any).blogs.title} | </span>}
                Page: wr-{search.web_result_page} | Position: {search.position}
              </p>
            </div>
            <div className="space-x-2">
              <Button 
                onClick={() => handleEdit(search)} 
                variant="outline" 
                size="sm"
                className={isSearchProject ? "border-[#2a3f5f] text-gray-300 hover:bg-[#2a3f5f]" : ""}
              >
                Edit
              </Button>
              <Button 
                onClick={() => handleDelete(search.id)} 
                variant="destructive" 
                size="sm"
                className={isSearchProject ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogClass}>
          <DialogHeader>
            <DialogTitle className={isSearchProject ? "text-white" : ""}>
              {editingSearch ? 'Edit' : 'Add'} Related Search
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Only show Blog field for projects that need it */}
            {needsBlogs && (
              <div>
                <Label className={labelClass}>Blog *</Label>
                <Select value={formData.blog_id} onValueChange={(value) => setFormData({ ...formData, blog_id: value })}>
                  <SelectTrigger className={inputClass}>
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
            )}

            <div>
              <Label className={labelClass}>Title (visible to users)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Best Social Media Platforms 2024"
                className={inputClass}
              />
            </div>

            <div>
              <Label className={labelClass}>Search Text</Label>
              <Input
                value={formData.search_text}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                required
                placeholder="Internal search text"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Web Result Page (1-4)</Label>
                <Select
                  value={formData.web_result_page.toString()}
                  onValueChange={(value) => setFormData({ ...formData, web_result_page: parseInt(value) })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Page 1</SelectItem>
                    <SelectItem value="2">Page 2</SelectItem>
                    <SelectItem value="3">Page 3</SelectItem>
                    <SelectItem value="4">Page 4</SelectItem>
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
              <Label className={labelClass}>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className={inputClass}
              />
              <p className={isSearchProject ? "text-xs text-gray-500 mt-1" : "text-xs text-muted-foreground mt-1"}>
                Lower numbers appear first
              </p>
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
                {editingSearch ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
