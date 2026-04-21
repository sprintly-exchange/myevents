import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Mail, TrendingUp, Plus, Clock } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const stats = [
    { label: 'Total Events', value: events.length, icon: <Calendar className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'Upcoming Events', value: upcomingEvents, icon: <Clock className="h-5 w-5 text-green-500" />, bg: 'bg-green-50' },
    { label: 'Pending Invitations', value: pendingInvitations, icon: <Mail className="h-5 w-5 text-orange-500" />, bg: 'bg-orange-50' },
    { label: 'Plan Limit', value: eventLimit === -1 ? '∞' : `${events.length}/${eventLimit}`, icon: <TrendingUp className="h-5 w-5 text-purple-500" />, bg: 'bg-purple-50' },
  ];

  const recentEvents = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <Link to="/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Events</CardTitle>
              <Link to="/events" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events yet</p>
                  <Link to="/events/new">
                    <Button variant="outline" size="sm" className="mt-3">Create your first event</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map(event => (
                    <Link key={event.id} to={`/events/${event.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={new Date(event.event_date) > new Date() ? 'default' : 'secondary'}>
                        {new Date(event.event_date) > new Date() ? 'Upcoming' : 'Past'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <Link to="/invitations" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {pendingInvitations === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.filter(i => i.status === 'pending').slice(0, 5).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                      <div>
                        <p className="font-medium text-sm">{inv.event_title}</p>
                        <p className="text-xs text-gray-500">From {inv.sender_name}</p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
