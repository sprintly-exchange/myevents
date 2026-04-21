import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Calendar, MapPin, Users, Trash2, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
            <p className="text-gray-500 mt-1">Manage your events</p>
          </div>
          <Link to="/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Usage bar */}
        {eventLimit !== -1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Events used</span>
                <span className="font-medium">{limitLabel}</span>
              </div>
              <Progress value={progressVal} className="h-2" />
              {events.length >= eventLimit && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-orange-600">You've reached your plan limit.</p>
                  <Link to="/upgrade">
                    <Button variant="outline" size="sm">Upgrade Plan</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No events yet</h3>
              <p className="text-gray-400 mb-6">Create your first event to get started</p>
              <Link to="/events/new">
                <Button><Plus className="h-4 w-4 mr-2" />Create Event</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: Event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
                    <Badge variant={new Date(event.event_date) > new Date() ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {new Date(event.event_date) > new Date() ? 'Upcoming' : 'Past'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.event_date).toLocaleDateString('sv-SE', { dateStyle: 'medium' })}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    {event.invitation_count || 0} invited · {event.accepted_count || 0} accepted
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link to={`/events/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                    </Link>
                    <Link to={`/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm('Delete this event?')) deleteMutation.mutate(event.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
