import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Send, Copy, Edit, ArrowLeft, Lock, X, UserPlus, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Invitation } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [stagingGuests, setStagingGuests] = useState<{ email: string; name: string }[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const isPaid = user?.payment_status === 'paid' || user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get('/admin/public-settings').then(r => r.data),
    enabled: !isPaid,
  });
  const freeLimit = parseInt(settingsData?.free_tier_invite_limit || '1', 10);

  const sendMutation = useMutation({
    mutationFn: (emails: string[]) =>
      api.post('/invitations', { event_id: id, emails, template_id: event?.template_id }),
    onSuccess: (res) => {
      toast.success(t('events.invitationsSent', { count: res.data.count }));
      setStagingGuests([]);
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err: any) => {
      if (err.response?.status === 402 && err.response?.data?.upgrade_required) {
        qc.invalidateQueries({ queryKey: ['event', id] });
      }
      toast.error(err.response?.data?.error || 'Failed to send invitations');
    },
  });

  const event = data?.event;
  const invitations: Invitation[] = data?.invitations || [];
  const usedInvites = invitations.length;
  const limitReached = !isPaid && freeLimit > 0 && usedInvites >= freeLimit;

  const addGuest = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (stagingGuests.find(g => g.email === email)) return;
    setStagingGuests(prev => [...prev, { email, name: nameInput.trim() }]);
    setEmailInput('');
    setNameInput('');
  };

  const removeGuest = (email: string) =>
    setStagingGuests(prev => prev.filter(g => g.email !== email));

  const sendInvitations = () => {
    if (stagingGuests.length === 0) return;
    sendMutation.mutate(stagingGuests.map(g => g.email));
  };

  const copyRsvpLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/rsvp/${token}`);
    toast.success(t('events.linkCopied'));
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted')
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{t('invitations.accepted')}</span>;
    if (status === 'rejected')
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">{t('invitations.declined')}</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{t('common.pending')}</span>;
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    </AppLayout>
  );
  if (!event) return (
    <AppLayout>
      <div className="p-8 text-center text-slate-500">Event not found</div>
    </AppLayout>
  );

  const isUpcoming = new Date(event.event_date) > new Date();
  const dateDisplay = new Date(event.event_date).toLocaleDateString(
    i18n.language === 'sv' ? 'sv-SE' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </button>

        {/* ── Event Header ── */}
        <div className={cn(
          'rounded-2xl p-6 mb-6',
          isUpcoming
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
            : 'bg-gradient-to-r from-slate-600 to-slate-700'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mb-3">
                {isUpcoming ? t('common.upcoming') : t('common.past')}
              </span>
              <h1 className="text-2xl font-bold text-white mb-1 truncate">{event.title}</h1>
              {event.description && (
                <p className="text-white/75 text-sm leading-relaxed line-clamp-2">{event.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {event.share_token && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/e/${event.share_token}`);
                    toast.success('Share link copied!');
                  }}
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />Share
                </Button>
              )}
              <Link to={`/events/${id}/edit`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />{t('common.edit')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 shrink-0">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">Date</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{dateDisplay}</p>
            </div>
          </div>

          <div className={cn(
            'bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 flex items-center gap-3',
            !event.location && 'opacity-50'
          )}>
            <div className="p-2 rounded-lg bg-rose-50 shrink-0">
              <MapPin className="h-4 w-4 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">{t('events.location')}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{event.location || 'Not set'}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 shrink-0">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">{t('events.guests')}</p>
              <p className="text-sm font-semibold text-slate-800">{invitations.length} invited</p>
            </div>
          </div>
        </div>

        {/* ── Invite Guests Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-semibold text-slate-900">{t('events.sendInvitations')}</h2>
            {!isPaid && freeLimit > 0 && (
              <span className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full border',
                limitReached
                  ? 'text-red-600 bg-red-50 border-red-200'
                  : 'text-amber-600 bg-amber-50 border-amber-200'
              )}>
                {usedInvites}/{freeLimit} free {freeLimit === 1 ? 'invite' : 'invites'} used
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-5">Add guests below, then send all at once.</p>

          {(!isPaid && freeLimit === 0) || limitReached ? (
            /* Lock panel */
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 text-sm mb-1">
                  {limitReached ? `Free invite limit reached (${usedInvites}/${freeLimit})` : t('events.paymentRequiredTitle')}
                </p>
                <p className="text-sm text-amber-700 mb-3">
                  {limitReached
                    ? `You've used all ${freeLimit} free invite${freeLimit !== 1 ? 's' : ''} for this event. Complete your payment to invite unlimited guests.`
                    : t('events.paymentRequiredDesc')}
                </p>
                <Link to="/upgrade">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                    {t('events.completePayment')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Input row */}
              <div className="flex gap-2 mb-4">
                <Input
                  type="email"
                  placeholder="guest@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                  className="flex-1 border-slate-200 focus:border-blue-400"
                />
                <Input
                  placeholder="Name (optional)"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                  className="w-40 border-slate-200 focus:border-blue-400"
                />
                <Button
                  type="button"
                  onClick={addGuest}
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />Add
                </Button>
              </div>

              {/* Staging list */}
              {stagingGuests.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100 mb-4">
                  {stagingGuests.map(g => (
                    <div key={g.email} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{g.email}</p>
                        {g.name && <p className="text-xs text-slate-400">{g.name}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGuest(g.email)}
                        className="ml-3 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Send button */}
              <Button
                onClick={sendInvitations}
                disabled={stagingGuests.length === 0 || sendMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMutation.isPending
                  ? t('events.sending')
                  : `Send ${stagingGuests.length > 0 ? `${stagingGuests.length} ` : ''}Invitation${stagingGuests.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </div>

        {/* ── Guest List Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              {t('events.guestList')}
              <span className="ml-2 text-sm font-normal text-slate-400">({invitations.length})</span>
            </h2>
          </div>

          {invitations.length === 0 ? (
            <div className="flex flex-col items-center py-14 px-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">{t('events.noGuestsYet')}</h3>
              <p className="text-sm text-slate-400">Add guests above to send your first invitations</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invitations.map(inv => (
                <li key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{inv.recipient_email}</p>
                    {inv.recipient_name && (
                      <p className="text-xs text-slate-400">{inv.recipient_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {statusBadge(inv.status)}
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {new Date(inv.sent_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => copyRsvpLink(inv.token)}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                      title={t('events.copyLink')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
