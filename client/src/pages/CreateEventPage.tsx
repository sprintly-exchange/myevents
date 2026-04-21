import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Template } from '@/types';
import { cn } from '@/lib/utils';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    template_id: '',
  });

  const { data: tmplData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  });

  const templates: Template[] = tmplData?.templates || [];

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/events', data),
    onSuccess: (res) => {
      toast.success('Event created!');
      navigate(`/events/${res.data.event.id}`);
    },
    onError: (err: any) => {
      if (err.response?.status === 403) {
        toast.error('Event limit reached. Please upgrade your plan.');
        navigate('/upgrade');
      } else {
        toast.error(err.response?.data?.error || 'Failed to create event');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) {
      toast.error('Title and date are required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" />Back to Events
        </button>

        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Event Title *</Label>
                <Input id="title" placeholder="Summer Party 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe your event..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="event_date">Date & Time *</Label>
                  <Input id="event_date" type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="Stockholm, Sweden" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
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
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, template_id: t.id })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                        form.template_id === t.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, template_id: '' })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                      !form.template_id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    No template
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
