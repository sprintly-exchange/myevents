import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, Palette, Ban, ChevronDown, ChevronUp, Eye, ExternalLink, Calendar, Clock, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Template, ThemeSettings } from '@/types';
import { cn } from '@/lib/utils';
import { TimePickerInput } from '@/components/ui/time-picker';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { getBrowserTimezone } from '@/lib/tz';

const THEME_META: Record<string, { gradient: string; emoji: string; descKey: string; primary: string; accent: string }> = {
  Elegant:     { gradient: 'from-[#1a1a2e] to-[#c9a84c]', emoji: '✨', descKey: 'events.themeElegantDesc',    primary: '#1a1a2e', accent: '#c9a84c' },
  Party:       { gradient: 'from-purple-500 via-pink-500 to-orange-400', emoji: '🎉', descKey: 'events.themePartyDesc',   primary: '#9333ea', accent: '#f97316' },
  Corporate:   { gradient: 'from-slate-700 to-blue-700', emoji: '💼', descKey: 'events.themeCorporateDesc',         primary: '#1e3a5f', accent: '#3b82f6' },
  Studentfest: { gradient: 'from-[#005B99] to-[#FECC02]', emoji: '🎓', descKey: 'events.themeStudentfestDesc',  primary: '#005B99', accent: '#FECC02' },
};

function formatDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function DateTimeInput({
  label, value, onChange, min, required, optional,
}: {
  label: string; value: string; onChange: (v: string) => void;
  min?: string; required?: boolean; optional?: boolean;
}) {
  const { t } = useTranslation();
  const date = value ? value.split('T')[0] : '';
  const time = value ? value.split('T')[1] || '' : '';
  const set = (d: string, tt: string) => {
    if (!d) { onChange(''); return; }
    onChange(`${d}T${tt || '00:00'}`);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs font-normal text-slate-400">({t('events.endDateOptional')})</span>}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <input
            type="date"
            value={date}
            min={min?.split('T')[0]}
            required={required}
            onChange={e => set(e.target.value, time)}
            className={cn(
              'w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 bg-white',
              'hover:border-slate-300 transition-colors'
            )}
          />
        </div>
        <div className="w-[120px]">
          <TimePickerInput
            value={time}
            onChange={tt => set(date, tt)}
            label={t('agenda.timeLabel')}
            confirmLabel={t('agenda.setTime')}
            triggerClassName="h-10 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

function ThemeSelector({ templates, value, onChange, onThemeChange }: {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
  onThemeChange: (meta: { primary: string; accent: string } | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button type="button" onClick={() => { onChange(''); onThemeChange(null); }}
        className={cn('relative p-4 rounded-xl border-2 text-left transition-all',
          !value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
        {!value && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
        <div className="w-full h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2"><Ban className="h-4 w-4 text-slate-300" /></div>
        <p className={cn('text-sm font-semibold', !value ? 'text-blue-700' : 'text-slate-600')}>{t('events.noTheme')}</p>
        <p className="text-xs text-slate-400 mt-0.5">{t('events.plainEmail')}</p>
      </button>
      {templates.map(tmpl => {
        const selected = value === tmpl.id;
        const meta = THEME_META[tmpl.name] ?? { gradient: 'from-slate-400 to-slate-600', emoji: '📋', descKey: '', primary: '#334155', accent: '#64748b' };
        return (
          <button key={tmpl.id} type="button"
            onClick={() => { onChange(tmpl.id); onThemeChange({ primary: meta.primary, accent: meta.accent }); }}
            className={cn('relative p-4 rounded-xl border-2 text-left transition-all',
              selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
            {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
            <div className={cn('w-full h-10 rounded-lg bg-gradient-to-r mb-2 flex items-center justify-center text-lg', meta.gradient)}>
              {meta.emoji}
            </div>
            <p className={cn('text-sm font-semibold', selected ? 'text-blue-700' : 'text-slate-700')}>{tmpl.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{meta.descKey ? t(meta.descKey) : ''}</p>
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
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '', template_id: '', timezone: getBrowserTimezone() });
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['event', id], queryFn: () => api.get(`/events/${id}`).then(r => r.data) });
  const { data: tmplData } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) });
  const templates: Template[] = tmplData?.templates || [];

  useEffect(() => {
    if (data?.event) {
      const e = data.event;
      setForm({ title: e.title, description: e.description || '', event_date: e.event_date ? e.event_date.slice(0, 16) : '', end_date: e.end_date ? e.end_date.slice(0, 16) : '', location: e.location || '', template_id: e.template_id || '', timezone: e.timezone || getBrowserTimezone() });
      setThemeSettings(e.theme_settings || {});
      setShareToken(e.share_token || null);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: any) => api.put(`/events/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('events.eventUpdated'));
      navigate(`/events/${id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || t('events.updateFailed')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, end_date: form.end_date || null, theme_settings: Object.keys(themeSettings).length > 0 ? themeSettings : null });
  };

  const applyThemeDefaults = (meta: { primary: string; accent: string } | null) => {
    if (meta) {
      setThemeSettings(s => ({ ...s, primary_color: meta.primary, accent_color: meta.accent }));
    }
  };

  const previewUrl = shareToken ? `${window.location.origin}/e/${shareToken}` : null;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(`/events/${id}`)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" />{t('common.back')}
          </button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 border-slate-200 text-slate-600 hover:text-blue-600">
                <Eye className="h-3.5 w-3.5" />{t('events.previewPage')}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>
            </a>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t('events.editEventTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('events.editEventSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.eventTitle')} <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="border-slate-200 focus:border-blue-400" />
          </div>
          <DateTimeInput
            label={t('events.date')}
            value={form.event_date}
            onChange={v => setForm({ ...form, event_date: v })}
            required
          />
          <div className="space-y-1">
            <DateTimeInput
              label={t('events.endDateTime')}
              value={form.end_date}
              onChange={v => setForm({ ...form, end_date: v })}
              min={form.event_date}
              optional
            />
            {formatDuration(form.event_date, form.end_date) && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
                <Clock className="h-3.5 w-3.5" />
                {t('events.duration')}: {formatDuration(form.event_date, form.end_date)}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.timezone')}</Label>
            <TimezoneSelect
              value={form.timezone}
              onChange={tz => setForm(f => ({ ...f, timezone: tz }))}
            />
            <p className="text-xs text-slate-400">{t('events.timezoneHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />{t('events.location')}
            </Label>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="border-slate-200 focus:border-blue-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">{t('events.description')}</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="border-slate-200 focus:border-blue-400 resize-none" />
          </div>

          {/* Theme selector */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-500" />
              <Label className="text-sm font-medium text-slate-700">{t('events.eventTheme')}</Label>
              <span className="text-xs text-slate-400 ml-1">— {t('events.themeControlsDesc')}</span>
            </div>
            <ThemeSelector
              templates={templates}
              value={form.template_id}
              onChange={tid => setForm(f => ({ ...f, template_id: tid }))}
              onThemeChange={applyThemeDefaults}
            />
          </div>

          {/* Customize panel — only when a theme is selected */}
          {form.template_id && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setCustomizeOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-violet-500" />
                  {t('events.customizeColors')}
                  {(themeSettings.primary_color || themeSettings.accent_color || themeSettings.tagline) && (
                    <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
                  )}
                </span>
                {customizeOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {customizeOpen && (
                <div className="p-4 space-y-4 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('events.mainColour')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeSettings.primary_color || '#1a1a2e'}
                          onChange={e => setThemeSettings(s => ({ ...s, primary_color: e.target.value }))}
                          className="h-9 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                        />
                        <Input
                          value={themeSettings.primary_color || ''}
                          onChange={e => setThemeSettings(s => ({ ...s, primary_color: e.target.value }))}
                          placeholder="#1a1a2e"
                          className="border-slate-200 focus:border-blue-400 h-9 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('events.accentColour')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeSettings.accent_color || '#c9a84c'}
                          onChange={e => setThemeSettings(s => ({ ...s, accent_color: e.target.value }))}
                          className="h-9 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                        />
                        <Input
                          value={themeSettings.accent_color || ''}
                          onChange={e => setThemeSettings(s => ({ ...s, accent_color: e.target.value }))}
                          placeholder="#c9a84c"
                          className="border-slate-200 focus:border-blue-400 h-9 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('events.customTagline')}</Label>
                    <Input
                      value={themeSettings.tagline || ''}
                      onChange={e => setThemeSettings(s => ({ ...s, tagline: e.target.value }))}
                      placeholder={t('events.taglinePlaceholder')}
                      className="border-slate-200 focus:border-blue-400"
                    />
                    <p className="text-xs text-slate-400">{t('events.taglineHint')}</p>
                  </div>

                  {/* Mini live preview swatch */}
                  <div
                    className="rounded-lg p-4 text-center text-sm font-medium transition-all"
                    style={{
                      background: themeSettings.primary_color || '#1a1a2e',
                      color: themeSettings.accent_color || '#c9a84c',
                    }}
                  >
                    {themeSettings.tagline || t('events.taglinePreview')}
                    <div className="mt-2">
                      <span
                        className="inline-block px-4 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: themeSettings.accent_color || '#c9a84c', color: themeSettings.primary_color || '#1a1a2e' }}
                      >
                        RSVP
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setThemeSettings({})}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    {t('events.resetThemeDefaults')}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 h-11" disabled={mutation.isPending}>
              {mutation.isPending ? t('events.saving') : t('events.saveEvent')}
            </Button>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button type="button" variant="outline" className="h-11 gap-2 border-slate-200">
                  <Eye className="h-4 w-4" />Preview
                </Button>
              </a>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

