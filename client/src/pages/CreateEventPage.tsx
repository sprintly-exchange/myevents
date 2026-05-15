import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Palette, Ban, Calendar, Clock, MapPin, FileText, Sparkles, QrCode, ClipboardList, BellRing, Globe, Lock } from 'lucide-react';
import { Template } from '@/types';
import { cn } from '@/lib/utils';
import { TimePickerInput } from '@/components/ui/time-picker';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { getBrowserTimezone } from '@/lib/tz';

const THEME_META: Record<string, { gradient: string; emoji: string; descKey: string }> = {
  Elegant:     { gradient: 'from-[#1a1a2e] to-[#c9a84c]', emoji: '✨', descKey: 'events.themeElegantDesc' },
  Party:       { gradient: 'from-purple-500 via-pink-500 to-orange-400', emoji: '🎉', descKey: 'events.themePartyDesc' },
  Corporate:   { gradient: 'from-slate-700 to-blue-700', emoji: '💼', descKey: 'events.themeCorporateDesc' },
  Studentfest: { gradient: 'from-[#005B99] to-[#FECC02]', emoji: '🎓', descKey: 'events.themeStudentfestDesc' },
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

function SectionCard({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
        <span className="text-blue-500">{icon}</span>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function ThemeSelector({ templates, value, onChange }: {
  templates: Template[]; value: string; onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <button type="button" onClick={() => onChange('')}
        className={cn('relative p-3 rounded-xl border-2 text-left transition-all',
          !value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
        {!value && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
        <div className="w-full h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2"><Ban className="h-3.5 w-3.5 text-slate-300" /></div>
        <p className={cn('text-xs font-semibold', !value ? 'text-blue-700' : 'text-slate-600')}>{t('events.noTheme')}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{t('events.plainEmail')}</p>
      </button>
      {templates.map(tmpl => {
        const selected = value === tmpl.id;
        const meta = THEME_META[tmpl.name] ?? { gradient: 'from-slate-400 to-slate-600', emoji: '📋', descKey: '' };
        return (
          <button key={tmpl.id} type="button" onClick={() => onChange(tmpl.id)}
            className={cn('relative p-3 rounded-xl border-2 text-left transition-all',
              selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
            {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
            <div className={cn('w-full h-8 rounded-lg bg-gradient-to-r mb-2 flex items-center justify-center text-base', meta.gradient)}>
              {meta.emoji}
            </div>
            <p className={cn('text-xs font-semibold', selected ? 'text-blue-700' : 'text-slate-700')}>{tmpl.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{meta.descKey ? t(meta.descKey) : ''}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    location: '',
    template_id: '',
    event_type: 'invite_only' as 'public' | 'invite_only',
    event_language: ((SUPPORTED_LANGUAGES as string[]).includes(i18n.language?.slice(0, 2) ?? '') ? i18n.language.slice(0, 2) : 'sv') as SupportedLanguage,
    enable_qr_checkin: false,
    enable_agenda: false,
    enable_reminder_accepted: false,
    enable_reminder_pending: false,
    reminder_days_before: 0,
    timezone: getBrowserTimezone(),
  });
  type CreateEventPayload = Omit<typeof form, 'end_date'> & { end_date: string | null };

  const { data: tmplData } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) });
  const templates: Template[] = tmplData?.templates || [];

  const mutation = useMutation({
    mutationFn: (data: CreateEventPayload) => api.post('/events', data),
    onSuccess: (res) => { toast.success(t('events.eventCreated')); navigate(`/events/${res.data.event.id}`); },
    onError: (err: any) => {
      if (err.response?.status === 403) { toast.error(t('events.eventLimitReached')); navigate('/upgrade'); }
      else toast.error(err.response?.data?.error || t('events.failedToCreate'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) { toast.error(t('events.validationRequired')); return; }
    const payload: CreateEventPayload = { ...form, end_date: form.end_date || null };
    mutation.mutate(payload);
  };

  const duration = formatDuration(form.event_date, form.end_date);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('events.createEventTitle')}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t('events.createEventSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Details */}
          <SectionCard icon={<FileText className="h-4 w-4" />} title={t('events.basicInfo')}>
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
                {t('events.eventTitle')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('events.eventTitlePlaceholder')}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                maxLength={100}
                className="border-slate-200 focus:border-blue-400 h-10"
              />
              {form.title && (
                <p className="text-xs text-slate-400 text-right">{form.title.length}/100</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700">{t('events.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('events.descriptionPlaceholder')}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={500}
                className="border-slate-200 focus:border-blue-400 resize-none"
              />
              {form.description && (
                <p className="text-xs text-slate-400 text-right">{form.description.length}/500</p>
              )}
            </div>
          </SectionCard>

          {/* When & Where */}
          <SectionCard icon={<Calendar className="h-4 w-4" />} title={t('events.whenAndWhere')}>
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
              {duration && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  {t('events.duration')}: {duration}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">{t('events.timezone')}</Label>
              <TimezoneSelect
                value={form.timezone}
                onChange={tz => setForm({ ...form, timezone: tz })}
              />
              <p className="text-xs text-slate-400">{t('events.timezoneHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {t('events.location')}
              </Label>
              <Input
                id="location"
                placeholder={t('events.locationPlaceholder')}
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="border-slate-200 focus:border-blue-400 h-10"
              />
            </div>
          </SectionCard>

          {/* Theme / Appearance */}
          <SectionCard icon={<Palette className="h-4 w-4" />} title={t('events.eventTheme')}>
            <p className="text-xs text-slate-500 -mt-1">{t('events.themeControlsDesc')}</p>
            <ThemeSelector templates={templates} value={form.template_id} onChange={id => setForm({ ...form, template_id: id })} />
          </SectionCard>

          <SectionCard icon={<Sparkles className="h-4 w-4" />} title={t('events.optionalFeatures')}>
            <p className="text-xs text-slate-500 -mt-1">{t('events.optionalFeaturesDesc')}</p>

            {/* Event Type toggle */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-slate-500" />
                {t('events.eventType')}
              </p>
              <p className="text-xs text-slate-500">{t('events.eventTypeDesc')}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, event_type: 'invite_only' })}
                  className={cn('flex-1 flex items-center gap-2 justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors', form.event_type === 'invite_only' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                >
                  <Lock className="h-3.5 w-3.5" />
                  {t('events.eventTypeInviteOnly')}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, event_type: 'public' })}
                  className={cn('flex-1 flex items-center gap-2 justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors', form.event_type === 'public' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t('events.eventTypePublic')}
                </button>
              </div>
            </div>

            {/* Event Language selector */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-slate-500" />
                {t('events.eventLanguage')}
              </p>
              <p className="text-xs text-slate-500">{t('events.eventLanguageDesc')}</p>
              <div className="flex gap-2 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setForm({ ...form, event_language: lang })}
                    className={cn('flex-1 flex items-center gap-1.5 justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors', form.event_language === lang ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                  >
                    {t(`events.lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={form.enable_qr_checkin}
                onChange={e => setForm({ ...form, enable_qr_checkin: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-slate-500" />
                  {t('events.enableQrCheckin')}
                </p>
                <p className="text-xs text-slate-500">{t('events.enableQrCheckinDesc')}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={form.enable_agenda}
                onChange={e => setForm({ ...form, enable_agenda: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  {t('events.enableAgenda')}
                </p>
                <p className="text-xs text-slate-500">{t('events.enableAgendaDesc')}</p>
              </div>
            </label>
          </SectionCard>

          <SectionCard icon={<BellRing className="h-4 w-4" />} title={t('events.reminders')}>
            <p className="text-xs text-slate-500 -mt-1">{t('events.remindersDesc')}</p>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={form.enable_reminder_accepted}
                onChange={e => setForm({ ...form, enable_reminder_accepted: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800">{t('events.enableReminderAccepted')}</p>
                <p className="text-xs text-slate-500">{t('events.enableReminderAcceptedDesc')}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={form.enable_reminder_pending}
                onChange={e => setForm({ ...form, enable_reminder_pending: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800">{t('events.enableReminderPending')}</p>
                <p className="text-xs text-slate-500">{t('events.enableReminderPendingDesc')}</p>
              </div>
            </label>
            {(form.enable_reminder_accepted || form.enable_reminder_pending) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{t('events.reminderDaysBefore')}</label>
                <select
                  value={form.reminder_days_before}
                  onChange={e => setForm({ ...form, reminder_days_before: parseInt(e.target.value, 10) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
                >
                  <option value={0}>{t('events.reminderDisabled')}</option>
                  <option value={1}>{t('events.reminderDay', { count: 1 })}</option>
                  <option value={2}>{t('events.reminderDay', { count: 2 })}</option>
                  <option value={3}>{t('events.reminderDay', { count: 3 })}</option>
                  <option value={7}>{t('events.reminderDay', { count: 7 })}</option>
                </select>
                <p className="text-xs text-slate-400">{t('events.reminderDaysBeforeHint')}</p>
              </div>
            )}
          </SectionCard>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-sm font-semibold rounded-xl"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t('events.creating') : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('events.createButton')}
              </span>
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
