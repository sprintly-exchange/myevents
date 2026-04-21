import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Template } from '@/types';
import { cn } from '@/lib/utils';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '', template_id: '' });

  const { data } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: tmplData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  });

  const templates: Template[] = tmplData?.templates || [];

  useEffect(() => {
    if (data?.event) {
      const e = data.event;
      setForm({
        title: e.title,
        description: e.description || '',
        event_date: e.event_date ? e.event_date.slice(0, 16) : '',
        location: e.location || '',
        template_id: e.template_id || '',
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (d: typeof form) => api.put(`/events/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated!');
      navigate(`/events/${id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <button onClick={() => navigate(`/events/${id}`)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" />Back to Event
        </button>
        <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Date & Time *</Label>
                  <Input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {templates.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Email Template</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm({ ...form, template_id: t.id })}
                      className={cn('p-3 rounded-lg border-2 text-sm font-medium transition-all',
                        form.template_id === t.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300')}>
                      {t.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => setForm({ ...form, template_id: '' })}
                    className={cn('p-3 rounded-lg border-2 text-sm font-medium transition-all',
                      !form.template_id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300')}>
                    No template
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
