import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';

export default function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['rsvp', token],
    queryFn: () => api.get(`/invitations/rsvp/${token}`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.invitation?.event_share_token) {
      const params = new URLSearchParams({ invite: token! });
      if (data.invitation.recipient_name) params.set('inviteName', data.invitation.recipient_name);
      navigate(`/e/${data.invitation.event_share_token}?${params.toString()}`, { replace: true });
    }
  }, [data, token, navigate]);

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
          <p className="text-gray-500">{t('rsvp.invalidLinkDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );

  // Redirect is in progress — render spinner while navigating
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
