import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Calendar, MapPin, Users, Trash2, Edit, ArrowRight, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { isEventUpcoming, formatEventDate } from '@/lib/tz';

export default function EventsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('events.eventDeleted'));
    },
    onError: () => toast.error('Failed to delete event'),
  });

  const events: Event[] = data?.events || [];
  const eventLimit = user?.event_limit ?? 5;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('events.title')}</h1>
            <p className="text-slate-500 mt-1">{t('events.subtitle')}</p>
          </div>
          <Link to="/events/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('events.createEvent')}
            </Button>
          </Link>
        </div>

        {/* Plan usage pill */}
        {eventLimit !== -1 && events.length > 0 && (
          <div className="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-2.5 mb-6">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{events.length}</span>
              <span className="text-slate-400"> {t('events.eventsUsed', { limit: eventLimit })}</span>
            </p>
            {events.length >= eventLimit && (
              <Link to="/upgrade">
                <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-50 h-7 text-xs">
                  {t('nav.upgradePlan')}
                </Button>
              </Link>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-50 mb-6">
              <PartyPopper className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{t('events.createFirst')}</h3>
            <p className="text-slate-400 mb-8 max-w-xs">{t('events.noEventsSubtitle')}</p>
            <Link to="/events/new">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20">
                <Plus className="h-4 w-4 mr-2" />{t('events.createEvent')}
              </Button>
            </Link>
          </div>
        ) : (
          /* ── Card grid ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event: Event) => {
              const tz = event.timezone || 'Europe/Stockholm';
              const locale = i18n.language === 'sv' ? 'sv-SE' : i18n.language === 'si' ? 'si-LK' : 'en-US';
              const upcoming = isEventUpcoming(event.event_date, tz);
              const dateDisplay = formatEventDate(event.event_date, tz, locale).replace(/^\w+day,\s*/i, '').substring(0, 30);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                >
                  {/* Accent strip */}
                  <div className={cn(
                    'h-1.5 w-full',
                    upcoming
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                      : 'bg-slate-200'
                  )} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Title + status chip */}
                    <div className="flex items-start gap-2 mb-4">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>
                      <span className={cn(
                        'shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        upcoming
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      )}>
                        {upcoming ? t('common.upcoming') : t('common.past')}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5 mb-5 flex-1">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span>{dateDisplay}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Users className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                        <span>
                          <span className="font-medium text-slate-700">{event.invitation_count || 0}</span> {t('events.invitedLabel')}
                          {(event.accepted_count ?? 0) > 0 && (
                            <span className="text-emerald-600 ml-1.5">{t('events.acceptedLabel', { count: event.accepted_count })}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Link to={`/events/${event.id}`} className="flex-1">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                          {t('common.open')} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/edit`}>
                        <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 px-2.5"
                        onClick={() => {
                          if (window.confirm(t('events.deleteConfirm'))) deleteMutation.mutate(event.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
