import { MoreVertical } from 'lucide-react';

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
  const hostname = (() => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return targetUrl;
    }
  })();

  const getInitial = (text: string) => {
    return text.charAt(0).toUpperCase();
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer py-5 hover:bg-muted/30 rounded-lg px-2 transition-colors"
    >
      <div className="flex gap-3">
        {/* Favicon/Logo */}
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border mt-0.5">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-xs font-semibold text-muted-foreground">${getInitial(title)}</span>`;
                }
              }}
            />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {getInitial(title)}
            </span>
          )}
        </div>

        {/* All content aligned in a column */}
        <div className="flex-1 min-w-0">
          {/* Site info row */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm text-foreground">{hostname}</span>
            {isSponsored && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">
                Sponsored
              </span>
            )}
          </div>
          
          {/* URL */}
          <span className="text-xs text-muted-foreground block truncate mb-1">{targetUrl}</span>
          
          {/* Title - Blue link style */}
          <h3 className="text-xl text-blue-600 dark:text-blue-400 hover:underline decoration-1 underline-offset-2 cursor-pointer font-normal leading-snug mb-1">
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
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-full transition-opacity self-start"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
