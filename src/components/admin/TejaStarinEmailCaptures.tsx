import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { tejaStarinClient } from '@/integrations/tejastarin/client';

export const TejaStarinEmailCaptures = () => {
  const [captures, setCaptures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaptures();
  }, []);

  const fetchCaptures = async () => {
    setLoading(true);
    const { data, error } = await tejaStarinClient
      .from('email_submissions')
      .select('*, related_searches(search_text)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Failed to fetch email captures');
      console.error(error);
    } else if (data) {
      setCaptures(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div>Loading email captures...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Email Submissions</span>
          <Badge variant="secondary">{captures.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {captures.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No emails captured yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Related Search</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Captured At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {captures.map((capture) => (
                  <TableRow key={capture.id}>
                    <TableCell className="font-medium">{capture.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{capture.related_searches?.search_text || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{capture.ip_address || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{capture.session_id?.substring(0, 12) || 'N/A'}...</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(capture.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
