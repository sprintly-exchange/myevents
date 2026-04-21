import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Calendar, MapPin, Users, Trash2, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Event } from '@/types';

export default function EventsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  const events: Event[] = data?.events || [];
  const eventLimit = user?.event_limit ?? 5;
  const limitLabel = eventLimit === -1 ? 'Unlimited' : `${events.length} / ${eventLimit}`;
  const progressVal = eventLimit === -1 ? 0 : Math.min((events.length / eventLimit) * 100, 100);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Events</h1>
            <p className="text-slate-500 mt-1">Manage and track your events</p>
          </div>
          <Link to="/events/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Usage bar */}
        {eventLimit !== -1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Plan Usage</p>
                <p className="text-xs text-slate-400 mt-0.5">Events used this period</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">{limitLabel}</span>
            </div>
            <Progress value={progressVal} className="h-2" />
            {events.length >= eventLimit && (
              <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <p className="text-sm text-amber-700 font-medium">You've reached your plan limit.</p>
                <Link to="/upgrade">
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 flex flex-col items-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-5">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No events yet</h3>
            <p className="text-slate-400 mb-6">Create your first event to get started</p>
            <Link to="/events/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Create Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event: Event) => {
              const isUpcoming = new Date(event.event_date) > new Date();
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Colored top strip */}
                  <div className={`h-2 w-full ${isUpcoming ? 'bg-gradient-to-r from-indigo-500 to-blue-600' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors flex-1 mr-2">
                        {event.title}
                      </h3>
                      <Badge
                        variant={isUpcoming ? 'default' : 'secondary'}
                        className={`shrink-0 ${isUpcoming ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}`}
                      >
                        {isUpcoming ? 'Upcoming' : 'Past'}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
                        {new Date(event.event_date).toLocaleDateString('sv-SE', { dateStyle: 'medium' })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4 text-rose-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Users className="h-4 w-4 text-violet-400 shrink-0" />
                        {event.invitation_count || 0} invited · {event.accepted_count || 0} accepted
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <Link to={`/events/${event.id}`} className="flex-1">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          <Eye className="h-3.5 w-3.5 mr-1.5" />View
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/edit`}>
                        <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm('Delete this event?')) deleteMutation.mutate(event.id); }}
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
