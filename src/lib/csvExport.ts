// CSV Export utility functions

export const convertToCSV = (data: any[], columns: string[]): string => {
  if (!data.length) return '';
  
  // Header row
  const header = columns.join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        value = value.join('; ');
      }
      
      // Handle objects
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue}"`;
      }
      
      return stringValue;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], columns: string[], filename: string) => {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, filename);
};

// Common column configs for different data types
export const BLOG_COLUMNS = ['id', 'title', 'slug', 'author', 'status', 'category_id', 'created_at'];
export const RELATED_SEARCH_COLUMNS = ['id', 'search_text', 'blog_id', 'display_order', 'is_active'];
export const WEB_RESULT_COLUMNS = ['id', 'title', 'url', 'description', 'is_sponsored', 'is_active', 'order_index'];
export const EMAIL_CAPTURE_COLUMNS = ['id', 'email', 'page_key', 'source', 'country', 'captured_at'];
export const PRELANDING_COLUMNS = ['id', 'headline', 'description', 'button_text', 'background_color'];
