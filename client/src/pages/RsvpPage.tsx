import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [responded, setResponded] = useState(false);
  const [responseStatus, setResponseStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['rsvp', token],
    queryFn: () => api.get(`/invitations/rsvp/${token}`).then(r => r.data),
  });

  const respondMutation = useMutation({
    mutationFn: (status: string) => api.post(`/invitations/rsvp/${token}`, { name, status }),
    onSuccess: (_, status) => {
      setResponded(true);
      setResponseStatus(status);
      toast.success(status === 'accepted' ? 'You\'ve accepted the invitation!' : 'You\'ve declined the invitation.');
    },
    onError: () => toast.error('Failed to respond. The link may be invalid.'),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="py-12 text-center">
          <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('rsvp.invalidLink')}</h2>
          <p className="text-gray-500">This invitation link may be invalid or expired.</p>
        </CardContent>
      </Card>
    </div>
  );

  const inv = data.invitation;

  if (responded || (inv.status !== 'pending')) {
    const accepted = responded ? responseStatus === 'accepted' : inv.status === 'accepted';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${accepted ? 'bg-green-100' : 'bg-red-100'}`}>
              {accepted ? <Check className="h-8 w-8 text-green-600" /> : <X className="h-8 w-8 text-red-600" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {accepted ? 'See you there!' : 'Maybe next time!'}
            </h2>
            <p className="text-gray-500">
              {accepted
                ? `You've accepted the invitation to ${inv.event_title}.`
                : `You've declined the invitation to ${inv.event_title}.`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center border-b">
          <p className="text-sm text-gray-500 mb-1">You're invited to</p>
          <CardTitle className="text-2xl">{inv.event_title}</CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t('rsvp.hosted')} {inv.sender_name}</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">When</p>
                <p className="font-medium">{new Date(inv.event_date).toLocaleString('sv-SE')}</p>
              </div>
            </div>
            {inv.location && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <MapPin className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Where</p>
                  <p className="font-medium">{inv.location}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <Label htmlFor="name">{t('rsvp.yourName')}</Label>
            <Input id="name" placeholder={t('rsvp.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => respondMutation.mutate('accepted')}
              disabled={respondMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />{t('invitations.accept')}
            </Button>
            <Button
              variant="outline"
              className="w-full text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"
              onClick={() => respondMutation.mutate('rejected')}
              disabled={respondMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />{t('invitations.decline')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
