import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAIImageGeneration, getDefaultImageByTitle } from '@/hooks/useAIImageGeneration';

interface BlogImageSelectorProps {
  blogTitle: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
}

export function BlogImageSelector({ blogTitle, imageUrl, onImageChange }: BlogImageSelectorProps) {
  const { generateImage, isGenerating, defaultImages } = useAIImageGeneration();
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateAI = async () => {
    const newImageUrl = await generateImage(blogTitle);
    if (newImageUrl) {
      onImageChange(newImageUrl);
    }
  };

  const handleUseDefault = () => {
    const defaultUrl = getDefaultImageByTitle(blogTitle || 'default');
    onImageChange(defaultUrl);
  };

  return (
    <div className="space-y-3">
      <Label>Featured Image</Label>
      
      {/* Image buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateAI}
          disabled={isGenerating || !blogTitle.trim()}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-purple-500" />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Image'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseDefault}
          className="flex items-center gap-2"
        >
          <ImageIcon className="h-4 w-4 text-blue-500" />
          Use Default Image
        </Button>
      </div>

      {/* Manual URL input */}
      <Input
        value={imageUrl}
        onChange={(e) => onImageChange(e.target.value)}
        placeholder="Or paste image URL here..."
      />

      {/* Image preview */}
      {imageUrl && (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Featured image preview"
            className="w-full max-h-48 object-cover rounded-lg border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Quick default image picker */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick pick default images:</Label>
        <div className="flex gap-2 flex-wrap">
          {defaultImages.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onImageChange(url)}
              className={`w-16 h-12 rounded border-2 overflow-hidden transition-all ${
                imageUrl === url ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              }`}
            >
              <img src={url} alt={`Default ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
