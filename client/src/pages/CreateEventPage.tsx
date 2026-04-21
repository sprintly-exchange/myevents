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
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Events
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Event
            </span>
          </h1>
          <p className="text-slate-500 mt-1">Fill in the details for your upcoming event</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Event Details</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Summer Party 2025"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  className="border-slate-200 focus:border-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="border-slate-200 focus:border-blue-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event_date" className="text-sm font-medium text-slate-700">
                    Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={form.event_date}
                    onChange={e => setForm({ ...form, event_date: e.target.value })}
                    required
                    className="border-slate-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-sm font-medium text-slate-700">
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Stockholm, Sweden"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="border-slate-200 focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Template */}
          {templates.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-700">Email Template</h2>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-4">Choose a template for your invitation emails</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, template_id: t.id })}
                      className={cn(
                        'relative p-4 rounded-xl border-2 text-sm font-medium transition-all text-left',
                        form.template_id === t.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {form.template_id === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="w-full h-8 rounded bg-gradient-to-r from-slate-200 to-slate-300 mb-2 opacity-60" />
                      {t.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, template_id: '' })}
                    className={cn(
                      'relative p-4 rounded-xl border-2 text-sm font-medium transition-all text-left',
                      !form.template_id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {!form.template_id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="w-full h-8 rounded bg-slate-100 mb-2" />
                    No template
                  </button>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 h-11"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
