import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Mail, TrendingUp, Plus, Clock, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, Invitation } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();

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
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const stats = [
    {
      label: 'Total Events',
      value: events.length,
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconShadow: 'shadow-blue-500/30',
      border: 'border-l-blue-500',
    },
    {
      label: 'Upcoming Events',
      value: upcomingEvents,
      icon: <Clock className="h-5 w-5 text-emerald-600" />,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconShadow: 'shadow-emerald-500/30',
      border: 'border-l-emerald-500',
    },
    {
      label: 'Pending Invitations',
      value: pendingInvitations,
      icon: <Mail className="h-5 w-5 text-amber-600" />,
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      iconShadow: 'shadow-amber-500/30',
      border: 'border-l-amber-500',
    },
    {
      label: 'Plan Usage',
      value: eventLimit === -1 ? '∞' : `${events.length}/${eventLimit}`,
      icon: <TrendingUp className="h-5 w-5 text-violet-600" />,
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      iconShadow: 'shadow-violet-500/30',
      border: 'border-l-violet-500',
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
              New Event
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 border-l-4 ${stat.border} p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.iconBg} shadow-lg ${stat.iconShadow}`}>
                  <div className="[&>svg]:text-white">{stat.icon}</div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Events */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Events</h2>
              <Link to="/events" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-6 pb-6">
              {recentEvents.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Calendar className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">No events yet</h3>
                  <p className="text-sm text-slate-400 mb-4">Create your first event to get started</p>
                  <Link to="/events/new">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEvents.map(event => {
                    const isUpcoming = new Date(event.event_date) > new Date();
                    return (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isUpcoming ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div>
                            <p className="font-medium text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{event.title}</p>
                            <p className="text-xs text-slate-400">{new Date(event.event_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge
                          variant={isUpcoming ? 'default' : 'secondary'}
                          className={isUpcoming ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}
                        >
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Pending Invitations</h2>
              <Link to="/invitations" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-6 pb-6">
              {pendingInvitations === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Mail className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">No pending invitations</h3>
                  <p className="text-sm text-slate-400">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.filter(i => i.status === 'pending').slice(0, 5).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{inv.event_title}</p>
                        <p className="text-xs text-slate-500">From {inv.sender_name}</p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
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
