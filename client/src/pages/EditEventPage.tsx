import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, Palette, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '', template_id: '' });

  const { data } = useQuery({ queryKey: ['event', id], queryFn: () => api.get(`/events/${id}`).then(r => r.data) });
  const { data: tmplData } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) });
  const templates: Template[] = tmplData?.templates || [];

  useEffect(() => {
    if (data?.event) {
      const e = data.event;
      setForm({ title: e.title, description: e.description || '', event_date: e.event_date ? e.event_date.slice(0, 16) : '', location: e.location || '', template_id: e.template_id || '' });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (d: typeof form) => api.put(`/events/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', id] }); qc.invalidateQueries({ queryKey: ['events'] }); toast.success(t('events.eventUpdated')); navigate(`/events/${id}`); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
        <button onClick={() => navigate(`/events/${id}`)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </button>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('events.editEventTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('events.editEventSubtitle')}</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.eventTitle')} <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.date')} <span className="text-red-500">*</span></Label>
            <Input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.location')}</Label>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.description')}</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="border-slate-200 focus:border-blue-400 resize-none" />
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-500" />
              <Label className="text-sm font-medium text-slate-700">Event Theme</Label>
              <span className="text-xs text-slate-400 ml-1">— sets the look of your public page & email</span>
            </div>
            <ThemeSelector templates={templates} value={form.template_id} onChange={id => setForm(f => ({ ...f, template_id: id }))} />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-2" disabled={mutation.isPending}>
            {mutation.isPending ? t('events.saving') : t('events.saveEvent')}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
