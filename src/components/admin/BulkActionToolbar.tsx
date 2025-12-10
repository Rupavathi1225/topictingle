import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, CheckCircle, XCircle, Download, Copy } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { toast } from 'sonner';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isAllSelected: boolean;
  isDarkTheme?: boolean;
  // CSV Export props
  selectedData?: any[];
  allData?: any[];
  csvColumns?: string[];
  csvFilename?: string;
  showCsvExport?: boolean;
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
  selectedData = [],
  allData = [],
  csvColumns = [],
  csvFilename = 'export',
  showCsvExport = true,
}: BulkActionToolbarProps) => {
  const containerClass = isDarkTheme
    ? "flex flex-wrap items-center gap-3 p-3 bg-[#0d1520] rounded-lg border border-[#2a3f5f] mb-4"
    : "flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border mb-4";

  const textClass = isDarkTheme ? "text-gray-300" : "text-foreground";

  const handleExportSelected = () => {
    if (selectedData.length === 0) {
      toast.error('No items selected for export');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(selectedData, csvColumns, `${csvFilename}_selected_${timestamp}.csv`);
    toast.success(`Exported ${selectedData.length} item(s) to CSV`);
  };

  const handleExportAll = () => {
    if (allData.length === 0) {
      toast.error('No data available for export');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(allData, csvColumns, `${csvFilename}_all_${timestamp}.csv`);
    toast.success(`Exported ${allData.length} item(s) to CSV`);
  };

  const handleCopyToClipboard = async () => {
    if (selectedData.length === 0) {
      toast.error('No items selected to copy');
      return;
    }
    
    try {
      const text = selectedData.map(item => {
        return csvColumns.map(col => item[col] ?? '').join('\t');
      }).join('\n');
      
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${selectedData.length} item(s) to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

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

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {/* CSV Export buttons - always visible */}
        {showCsvExport && csvColumns.length > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              className={isDarkTheme 
                ? "border-blue-600 text-blue-400 hover:bg-blue-900/30" 
                : "border-blue-600 text-blue-600 hover:bg-blue-50"
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Export All CSV
            </Button>
            
            {selectedCount > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  className={isDarkTheme 
                    ? "border-purple-600 text-purple-400 hover:bg-purple-900/30" 
                    : "border-purple-600 text-purple-600 hover:bg-purple-50"
                  }
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export Selected ({selectedCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className={isDarkTheme 
                    ? "border-cyan-600 text-cyan-400 hover:bg-cyan-900/30" 
                    : "border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                  }
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </>
            )}
          </>
        )}

        {/* Action buttons - only visible when items selected */}
        {selectedCount > 0 && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
