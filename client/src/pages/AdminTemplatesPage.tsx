import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Trash2, Plus } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Template } from '@/types';

export default function AdminTemplatesPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Cannot delete system templates'),
  });

  const templates: Template[] = data?.templates || [];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-500 mt-1">Manage invitation email templates</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((t: Template) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.is_system ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mini preview */}
                  <div className="h-32 overflow-hidden rounded border bg-gray-50 mb-4 relative">
                    <div
                      className="absolute inset-0 transform scale-[0.25] origin-top-left pointer-events-none"
                      style={{ width: '400%', height: '400%' }}
                      dangerouslySetInnerHTML={{ __html: t.html_content }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreview(t)}>
                      <Eye className="h-3 w-3 mr-1" />Preview
                    </Button>
                    {!t.is_system && (
                      <Button size="sm" variant="outline" className="text-red-500"
                        onClick={() => { if (confirm('Delete template?')) deleteMutation.mutate(t.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded">
            <iframe
              srcDoc={preview?.html_content
                ?.replace(/{{event_title}}/g, 'Sample Event')
                .replace(/{{event_date}}/g, 'Saturday, August 15, 2025')
                .replace(/{{event_location}}/g, 'Stockholm, Sweden')
                .replace(/{{rsvp_url}}/g, '#')
                .replace(/{{sender_name}}/g, 'John Doe')
              }
              className="w-full h-96"
              title="Template Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
