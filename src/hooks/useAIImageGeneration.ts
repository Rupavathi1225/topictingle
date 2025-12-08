import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEFAULT_BLOG_IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop',
];

export const getDefaultImageByTitle = (title: string): string => {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_BLOG_IMAGES[hash % DEFAULT_BLOG_IMAGES.length];
};

export function useAIImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (blogTitle: string): Promise<string | null> => {
    if (!blogTitle.trim()) {
      toast.error('Please enter a blog title first');
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-image', {
        body: { blogTitle }
      });

      if (error) {
        console.error('Error generating image:', error);
        toast.error('Failed to generate image. Using default.');
        return getDefaultImageByTitle(blogTitle);
      }

      if (data?.imageUrl) {
        toast.success('Image generated successfully!');
        return data.imageUrl;
      } else if (data?.error) {
        toast.error(data.error);
        return getDefaultImageByTitle(blogTitle);
      }

      return getDefaultImageByTitle(blogTitle);
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Using default.');
      return getDefaultImageByTitle(blogTitle);
    } finally {
      setIsGenerating(false);
    }
  };

  const useDefaultImage = (blogTitle: string): string => {
    return getDefaultImageByTitle(blogTitle);
  };

  return {
    generateImage,
    useDefaultImage,
    isGenerating,
    defaultImages: DEFAULT_BLOG_IMAGES,
  };
}
