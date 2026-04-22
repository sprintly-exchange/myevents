import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Palette, Ban } from 'lucide-react';
import { Template } from '@/types';
import { cn } from '@/lib/utils';

const THEME_META: Record<string, { gradient: string; emoji: string; desc: string }> = {
  Elegant:     { gradient: 'from-[#1a1a2e] to-[#c9a84c]', emoji: '✨', desc: 'Formal & classic' },
  Party:       { gradient: 'from-purple-500 via-pink-500 to-orange-400', emoji: '🎉', desc: 'Fun & vibrant' },
  Corporate:   { gradient: 'from-slate-700 to-blue-700', emoji: '💼', desc: 'Professional' },
  Studentfest: { gradient: 'from-[#005B99] to-[#FECC02]', emoji: '🎓', desc: 'Swedish graduation' },
};

function ThemeSelector({ templates, value, onChange }: {
  templates: Template[]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button type="button" onClick={() => onChange('')}
        className={cn('relative p-4 rounded-xl border-2 text-left transition-all',
          !value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
        {!value && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
        <div className="w-full h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2"><Ban className="h-4 w-4 text-slate-300" /></div>
        <p className={cn('text-sm font-semibold', !value ? 'text-blue-700' : 'text-slate-600')}>No theme</p>
        <p className="text-xs text-slate-400 mt-0.5">Plain email</p>
      </button>
      {templates.map(tmpl => {
        const selected = value === tmpl.id;
        const meta = THEME_META[tmpl.name] ?? { gradient: 'from-slate-400 to-slate-600', emoji: '📋', desc: '' };
        return (
          <button key={tmpl.id} type="button" onClick={() => onChange(tmpl.id)}
            className={cn('relative p-4 rounded-xl border-2 text-left transition-all',
              selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
            {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
            <div className={cn('w-full h-10 rounded-lg bg-gradient-to-r mb-2 flex items-center justify-center text-lg', meta.gradient)}>
              {meta.emoji}
            </div>
            <p className={cn('text-sm font-semibold', selected ? 'text-blue-700' : 'text-slate-700')}>{tmpl.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '', template_id: '' });

  const { data: tmplData } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) });
  const templates: Template[] = tmplData?.templates || [];

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/events', data),
    onSuccess: (res) => { toast.success(t('events.eventCreated')); navigate(`/events/${res.data.event.id}`); },
    onError: (err: any) => {
      if (err.response?.status === 403) { toast.error('Event limit reached. Please upgrade your plan.'); navigate('/upgrade'); }
      else toast.error(err.response?.data?.error || 'Failed to create event');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) { toast.error('Title and date are required'); return; }
    mutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </button>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('events.createEventTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('events.createEventSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">{t('events.eventTitle')} <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder={t('events.eventTitlePlaceholder')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_date" className="text-sm font-medium text-slate-700">{t('events.date')} <span className="text-red-500">*</span></Label>
            <Input id="event_date" type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-sm font-medium text-slate-700">{t('events.location')}</Label>
            <Input id="location" placeholder={t('events.locationPlaceholder')} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">{t('events.description')}</Label>
            <Textarea id="description" placeholder={t('events.descriptionPlaceholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="border-slate-200 focus:border-blue-400 resize-none" />
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-500" />
              <Label className="text-sm font-medium text-slate-700">Event Theme</Label>
              <span className="text-xs text-slate-400 ml-1">— sets the look of your public page & email</span>
            </div>
            <ThemeSelector templates={templates} value={form.template_id} onChange={id => setForm({ ...form, template_id: id })} />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-2" disabled={mutation.isPending}>
            {mutation.isPending ? t('events.creating') : t('events.createButton')}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
