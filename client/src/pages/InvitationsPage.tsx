import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Calendar, MapPin, Check, X } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
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

  const borderColor = (status: string) => {
    if (status === 'accepted') return 'border-l-emerald-500';
    if (status === 'rejected') return 'border-l-red-400';
    return 'border-l-blue-500';
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Invitations</h1>
          <p className="text-slate-500 mt-1">Invitations sent to {user?.email}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 flex flex-col items-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-5">
              <Mail className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No invitations yet</h3>
            <p className="text-slate-400 text-sm">When someone invites you to an event, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv: Invitation) => (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 border-l-4 ${borderColor(inv.status)} overflow-hidden hover:shadow-md transition-shadow`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-lg text-slate-900">{inv.event_title}</h3>
                        {statusBadge(inv.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          {inv.event_date ? new Date(inv.event_date).toLocaleString('sv-SE') : '—'}
                        </div>
                        {inv.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-rose-400" />
                            {inv.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-slate-400" />
                          From {inv.sender_name}
                        </div>
                      </div>
                    </div>
                    {inv.status === 'pending' && (
                      <div className="flex gap-2 ml-4 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => respondMutation.mutate({ id: inv.id, status: 'accepted' })}
                          disabled={respondMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => respondMutation.mutate({ id: inv.id, status: 'rejected' })}
                          disabled={respondMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
