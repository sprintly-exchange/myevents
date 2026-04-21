import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Calendar, MapPin, Check, X } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Invitation } from '@/types';

export default function InvitationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invitations-incoming'],
    queryFn: () => api.get('/invitations/incoming').then(r => r.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/invitations/${id}/respond`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations-incoming'] });
      toast.success('Response recorded');
    },
    onError: () => toast.error('Failed to respond'),
  });

  const invitations: Invitation[] = data?.invitations || [];

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success">Accepted</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Declined</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Invitations</h1>
          <p className="text-gray-500 mt-1">Invitations sent to {user?.email}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Mail className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No invitations yet</h3>
              <p className="text-gray-400">When someone invites you to an event, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv: Invitation) => (
              <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{inv.event_title}</h3>
                        {statusBadge(inv.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {inv.event_date ? new Date(inv.event_date).toLocaleString('sv-SE') : '—'}
                        </div>
                        {inv.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {inv.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          From {inv.sender_name}
                        </div>
                      </div>
                    </div>
                    {inv.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" onClick={() => respondMutation.mutate({ id: inv.id, status: 'accepted' })}
                          disabled={respondMutation.isPending}>
                          <Check className="h-4 w-4 mr-1" />Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700"
                          onClick={() => respondMutation.mutate({ id: inv.id, status: 'rejected' })}
                          disabled={respondMutation.isPending}>
                          <X className="h-4 w-4 mr-1" />Decline
                        </Button>
                      </div>
                    )}
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
