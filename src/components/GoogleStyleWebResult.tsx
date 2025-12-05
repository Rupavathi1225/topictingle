import { MoreVertical, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface GoogleStyleWebResultProps {
  title: string;
  description?: string;
  logoUrl?: string;
  targetUrl: string;
  isSponsored?: boolean;
  onClick: () => void;
}

export const GoogleStyleWebResult = ({
  title,
  description,
  logoUrl,
  targetUrl,
  isSponsored,
  onClick,
}: GoogleStyleWebResultProps) => {
  const [imageError, setImageError] = useState(false);
  
  const hostname = (() => {
    try {
      return new URL(targetUrl).hostname.replace('www.', '');
    } catch {
      return targetUrl;
    }
  })();

  const getInitial = (text: string) => {
    return text.charAt(0).toUpperCase();
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(targetUrl);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer py-4 px-3 hover:bg-muted/50 rounded-xl transition-all duration-200 border border-transparent hover:border-border/50"
    >
      <div className="flex gap-3">
        {/* Favicon/Logo */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
          {logoUrl && !imageError ? (
            <img 
              src={logoUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : faviconUrl && !imageError ? (
            <img 
              src={faviconUrl} 
              alt=""
              className="w-5 h-5 object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {getInitial(title)}
            </span>
          )}
        </div>

        {/* All content aligned in a column */}
        <div className="flex-1 min-w-0">
          {/* Site info row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-foreground font-medium">{hostname}</span>
            {isSponsored && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded font-semibold uppercase tracking-wide">
                Ad
              </span>
            )}
          </div>
          
          {/* URL */}
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs text-muted-foreground truncate max-w-[90%]">{targetUrl}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          
          {/* Title - Blue link style */}
          <h3 className="text-lg text-blue-600 dark:text-blue-400 group-hover:underline decoration-1 underline-offset-2 font-medium leading-snug mb-1.5">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* More options icon (decorative) */}
        <button 
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-full transition-opacity self-start"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};