import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Template } from '@/types';

export default function AdminTemplatesPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [preview, setPreview] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success(t('admin.templates.templateDeleted'));
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Cannot delete system templates'),
  });

  const templates: Template[] = data?.templates || [];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('admin.templates.title')}</h1>
            <p className="text-slate-500 mt-1">{t('admin.templates.subtitle')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {templates.map((t: Template) => (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden hover:shadow-md transition-shadow group">
                {/* Mini preview */}
                <div className="h-40 overflow-hidden bg-slate-50 relative border-b border-slate-100">
                  <div
                    className="absolute inset-0 transform scale-[0.25] origin-top-left pointer-events-none"
                    style={{ width: '400%', height: '400%' }}
                    dangerouslySetInnerHTML={{ __html: t.html_content }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    {t.is_system ? (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-200 hover:bg-slate-50 text-xs"
                      onClick={() => setPreview(t)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />{/* t variable shadowed — Preview */}Preview
                    </Button>
                    {!t.is_system && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm('Delete template?')) deleteMutation.mutate(t.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-xl">
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
