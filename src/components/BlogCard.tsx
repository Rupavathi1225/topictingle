import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { useTracking } from "@/hooks/useTracking";

interface BlogCardProps {
  id: string;
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  author: string;
  featuredImage?: string;
  publishedAt: string;
  excerpt?: string;
  serialNumber?: number;
}

// Default placeholder images based on category/content
const DEFAULT_BLOG_IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop',
];

const getDefaultImage = (title: string) => {
  // Use title hash to consistently pick the same image for the same blog
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_BLOG_IMAGES[hash % DEFAULT_BLOG_IMAGES.length];
};

const BlogCard = ({
  title,
  slug,
  category,
  categorySlug,
  author,
  featuredImage,
  publishedAt,
  excerpt,
}: BlogCardProps) => {
  const { trackClick } = useTracking();
  const displayImage = featuredImage || getDefaultImage(title);

  const handleClick = () => {
    trackClick(`blog-card-${slug}`, title);
  };

  return (
    <article className="group">
      <Link to={`/blog/${categorySlug}/${slug}`} onClick={handleClick}>
        <div className="aspect-video overflow-hidden rounded-lg mb-4">
          <img
            src={displayImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/category/${categorySlug}`}
            className="inline-block text-xs font-semibold text-accent hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              trackClick(`category-${categorySlug}`, category);
            }}
          >
            {category}
          </Link>
        </div>
        
        <Link to={`/blog/${categorySlug}/${slug}`} onClick={handleClick}>
          <h2 className="text-2xl font-bold text-blog-heading group-hover:text-accent transition-colors line-clamp-2">
            {title}
          </h2>
        </Link>
        
        {excerpt && (
          <p className="text-blog-meta text-sm line-clamp-2">{excerpt}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-blog-meta">
          <Calendar className="h-4 w-4" />
          <time>{format(new Date(publishedAt), "MMM dd, yyyy")}</time>
          <span>•</span>
          <span>{author}</span>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
