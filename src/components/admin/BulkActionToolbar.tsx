import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isAllSelected: boolean;
  isDarkTheme?: boolean;
}

export const BulkActionToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDelete,
  onActivate,
  onDeactivate,
  isAllSelected,
  isDarkTheme = false,
}: BulkActionToolbarProps) => {
  const containerClass = isDarkTheme
    ? "flex items-center gap-4 p-3 bg-[#0d1520] rounded-lg border border-[#2a3f5f] mb-4"
    : "flex items-center gap-4 p-3 bg-muted/50 rounded-lg border mb-4";

  const textClass = isDarkTheme ? "text-gray-300" : "text-foreground";
  const mutedClass = isDarkTheme ? "text-gray-400" : "text-muted-foreground";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isAllSelected && totalCount > 0}
          onCheckedChange={onSelectAll}
          className={isDarkTheme ? "border-gray-500" : ""}
        />
        <span className={`text-sm ${textClass}`}>
          {selectedCount > 0 ? `${selectedCount} of ${totalCount} selected` : `Select all (${totalCount})`}
        </span>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onActivate}
            className={isDarkTheme 
              ? "border-green-600 text-green-400 hover:bg-green-900/30" 
              : "border-green-600 text-green-600 hover:bg-green-50"
            }
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            className={isDarkTheme 
              ? "border-gray-500 text-gray-400 hover:bg-gray-800" 
              : "border-gray-400 text-gray-600 hover:bg-gray-100"
            }
          >
            <XCircle className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className={isDarkTheme ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete ({selectedCount})
          </Button>
        </div>
      )}
    </div>
  );
};
