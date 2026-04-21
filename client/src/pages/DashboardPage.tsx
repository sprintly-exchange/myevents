import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Mail, TrendingUp, Plus, Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Event, Invitation } from '@/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  });

  const { data: invData } = useQuery({
    queryKey: ['invitations-incoming'],
    queryFn: () => api.get('/invitations/incoming').then(r => r.data),
  });

  const events: Event[] = eventsData?.events || [];
  const invitations: Invitation[] = invData?.invitations || [];

  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date()).length;
  const pendingInvitations = invitations.filter(i => i.status === 'pending').length;
  const eventLimit = user?.event_limit ?? 5;

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning') : hour < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const dateStr = new Date().toLocaleDateString(
    i18n.language === 'sv' ? 'sv-SE' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const stats = [
    {
      label: t('dashboard.totalEvents'),
      value: events.length,
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-600',
      icon: <Calendar className="h-5 w-5 text-white" />,
      accent: 'border-l-blue-500',
    },
    {
      label: t('dashboard.upcomingEvents'),
      value: upcomingEvents,
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      icon: <Clock className="h-5 w-5 text-white" />,
      accent: 'border-l-emerald-500',
    },
    {
      label: t('dashboard.pendingInvitations'),
      value: pendingInvitations,
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-600',
      icon: <Mail className="h-5 w-5 text-white" />,
      accent: 'border-l-amber-500',
    },
    {
      label: t('dashboard.planUsage'),
      value: eventLimit === -1 ? '∞' : `${events.length}/${eventLimit}`,
      iconBg: 'bg-violet-500',
      textColor: 'text-violet-600',
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      accent: 'border-l-violet-500',
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting}, {user?.name}! 👋
            </h1>
            <p className="text-slate-500 mt-1">{dateStr}</p>
          </div>
          <Link to="/events/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.newEvent')}
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <div
              key={stat.label}
              className={cn(
                'bg-white rounded-2xl shadow-sm border border-slate-200/70 border-l-4 p-5 hover:shadow-md transition-shadow',
                stat.accent
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl shadow-sm', stat.iconBg)}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-500 leading-tight">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Events */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">{t('dashboard.recentEvents')}</h2>
              <Link to="/events" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                {t('common.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {recentEvents.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Calendar className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">{t('dashboard.noEventsYet')}</h3>
                  <p className="text-sm text-slate-400 mb-4">{t('dashboard.noEventsSubtitle')}</p>
                  <Link to="/events/new">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />{t('dashboard.createEvent')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentEvents.map(event => {
                    const isUpcoming = new Date(event.event_date) > new Date();
                    return (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            isUpcoming ? 'bg-emerald-500' : 'bg-slate-300'
                          )} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(event.event_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          'shrink-0 ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          isUpcoming ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {isUpcoming ? t('common.upcoming') : t('common.past')}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">{t('dashboard.pendingInvitations')}</h2>
              <Link to="/invitations" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                {t('common.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {pendingInvitations === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Mail className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">{t('dashboard.noPendingInvitations')}</h3>
                  <p className="text-sm text-slate-400">{t('dashboard.allCaughtUp')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations
                    .filter(i => i.status === 'pending')
                    .slice(0, 5)
                    .map(inv => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">{inv.event_title}</p>
                          <p className="text-xs text-slate-500">
                            {t('dashboard.from')} {inv.sender_name}
                          </p>
                        </div>
                        <span className="shrink-0 ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {t('common.pending')}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
