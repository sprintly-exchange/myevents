import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Send, Copy, Edit, ArrowLeft, Lock, X, UserPlus, Share2, Eye, Ban, RefreshCw, Pencil, BookUser, Check, Search, ClipboardList, Info, QrCode, Globe, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { cn } from '@/lib/utils';
import { Contact, ContactGroup, Invitation } from '@/types';
import AgendaEditor from '@/components/AgendaEditor';
import GuidanceEditor from '@/components/GuidanceEditor';
import { formatEventDate, formatEventTime, isEventUpcoming, getTzDisplayName } from '@/lib/tz';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [stagingGuests, setStagingGuests] = useState<{ email: string; name: string }[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showGuestBookPicker, setShowGuestBookPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'guests' | 'agenda' | 'guidance'>('guests');

  const [editingInv, setEditingInv] = useState<Invitation | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

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

  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data),
  });
  const { data: groupsData } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/contacts/groups').then(r => r.data),
  });
  const allContacts: Contact[] = contactsData?.contacts || [];
  const allGroups: ContactGroup[] = groupsData?.groups || [];

  const sendMutation = useMutation({
    mutationFn: (guests: { email: string; name: string }[]) =>
      api.post('/invitations', { event_id: id, guests, template_id: event?.template_id }),
    onSuccess: (res) => {
      toast.success(t('events.invitationsSent', { count: res.data.count }));
      setStagingGuests([]);
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err: any) => {
      if (err.response?.status === 402 && err.response?.data?.upgrade_required) {
        qc.invalidateQueries({ queryKey: ['event', id] });
        navigate('/upgrade');
        return;
      }
      toast.error(err.response?.data?.error || 'Failed to send invitations');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invId: string) => api.patch(`/invitations/${invId}/cancel`),
    onSuccess: () => {
      toast.success(t('invitations.cancelSuccess'));
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: () => toast.error(t('invitations.cancelError')),
  });

  const resendMutation = useMutation({
    mutationFn: (invId: string) => api.patch(`/invitations/${invId}/resend`),
    onSuccess: () => {
      toast.success(t('invitations.resendSuccess'));
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: () => toast.error(t('invitations.resendError')),
  });

  const editGuestMutation = useMutation({
    mutationFn: ({ invId, data }: { invId: string; data: { recipient_name: string; recipient_email: string; recipient_phone: string } }) =>
      api.patch(`/invitations/${invId}`, data),
    onSuccess: () => {
      toast.success(t('invitations.guestUpdated'));
      setEditingInv(null);
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: () => toast.error(t('invitations.guestUpdateError')),
  });

  const sendReminderMutation = useMutation({
    mutationFn: (type: 'accepted' | 'pending' | 'both') =>
      api.post(`/events/${id}/send-reminders`, { type }),
    onSuccess: (res, type) => {
      const count = res.data.sent as number;
      toast.success(t('events.remindersSent', { count }));
    },
    onError: () => toast.error(t('events.remindersFailed')),
  });

  const openEdit = (inv: Invitation) => {
    setEditingInv(inv);
    setEditName(inv.recipient_name || '');
    setEditEmail(inv.recipient_email);
    setEditPhone(inv.recipient_phone || '');
  };

  const event = data?.event;
  const invitations: Invitation[] = data?.invitations || [];
  const usedInvites = invitations.length;
  const limitReached = !isPaid && freeLimit > 0 && usedInvites >= freeLimit;
  const isQrEnabled = event?.enable_qr_checkin !== false;
  const isAgendaEnabled = event?.enable_agenda !== false;
  const isReminderAccepted = event?.enable_reminder_accepted === true;
  const isReminderPending = event?.enable_reminder_pending === true;
  const reminderDaysBefore = event?.reminder_days_before ?? 0;
  const hasAnyReminder = isReminderAccepted || isReminderPending;

  useEffect(() => {
    if (activeTab === 'agenda' && !isAgendaEnabled) {
      setActiveTab('guests');
    }
  }, [activeTab, isAgendaEnabled]);

  const addGuest = () => {
    const email = emailInput.trim().toLowerCase();
    const name = nameInput.trim();
    if (!email || !email.includes('@')) return;
    if (!name) { toast.error(t('events.guestNameRequired')); return; }
    if (stagingGuests.find(g => g.email === email)) return;
    setStagingGuests(prev => [...prev, { email, name }]);
    setEmailInput('');
    setNameInput('');
  };

  const removeGuest = (email: string) =>
    setStagingGuests(prev => prev.filter(g => g.email !== email));

  const sendInvitations = () => {
    if (stagingGuests.length === 0) return;
    sendMutation.mutate(stagingGuests);
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
    if (status === 'cancelled')
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">{t('invitations.cancelled')}</span>;
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
      <div className="p-8 text-center text-slate-500">{t('events.eventNotFound')}</div>
    </AppLayout>
  );

  const isUpcoming = isEventUpcoming(event.event_date, event.timezone || 'Europe/Stockholm');
  const locale = i18n.language === 'sv' ? 'sv-SE' : i18n.language === 'si' ? 'si-LK' : 'en-US';
  const tz = event.timezone || 'Europe/Stockholm';
  const dateDisplay = formatEventDate(event.event_date, tz, locale);
  const timeDisplay = formatEventTime(event.event_date, tz, locale);
  const endTimeDisplay = event.end_date ? formatEventTime(event.end_date, tz, locale) : null;

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
                <a href={`${window.location.origin}/e/${event.share_token}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />{t('common.preview')}
                  </Button>
                </a>
              )}
              {event.share_token && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/e/${event.share_token}`);
                    toast.success(t('events.shareLinkCopied'));
                  }}
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />{t('common.share')}
                </Button>
              )}
              <Link to={`/events/${id}/edit`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />{t('common.edit')}
                </Button>
              </Link>
              {isQrEnabled && (
                <Link to={`/events/${id}/checkin`}>
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <QrCode className="h-3.5 w-3.5 mr-1.5" />{t('checkin.title')}
                  </Button>
                </Link>
              )}
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
              <p className="text-xs text-slate-400 font-medium">{t('common.date')}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{dateDisplay}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {timeDisplay}{endTimeDisplay ? ` – ${endTimeDisplay}` : ''}
                {tz && <span className="text-slate-400 ml-1">({getTzDisplayName(tz)})</span>}
              </p>
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

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {([
            { key: 'guests', label: t('events.guestList'), icon: Users },
            ...(isAgendaEnabled ? [{ key: 'agenda', label: t('agenda.title'), icon: ClipboardList }] as const : []),
            { key: 'guidance', label: t('guidance.title'), icon: Info },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── Agenda Tab ── */}
        {activeTab === 'agenda' && isAgendaEnabled && id && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">{t('agenda.title')}</h2>
            <AgendaEditor eventId={id} />
          </div>
        )}

        {/* ── Guidance Tab ── */}
        {activeTab === 'guidance' && id && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">{t('guidance.title')}</h2>
            <GuidanceEditor eventId={id} />
          </div>
        )}

        {activeTab === 'guests' && (
        <>
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
                  placeholder={t('common.name')}
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

              {(allContacts.length > 0 || allGroups.length > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGuestBookPicker(true)}
                  className="border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 w-full mb-4"
                >
                  <BookUser className="h-4 w-4 mr-1.5" />
                  {t('guestBook.addFromGuestBook')}
                </Button>
              )}

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
                <li key={inv.id} className={cn(
                  'flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors',
                  inv.status === 'cancelled' && 'opacity-60'
                )}>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-sm font-medium text-slate-800 truncate',
                      inv.status === 'cancelled' && 'line-through text-slate-400'
                    )}>{inv.recipient_email}</p>
                    {inv.recipient_name && (
                      <p className="text-xs text-slate-400">{inv.recipient_name}</p>
                    )}
                    {inv.recipient_phone && (
                      <p className="text-xs text-slate-400">{inv.recipient_phone}</p>
                    )}
                    {inv.status !== 'cancelled' && (
                      <a
                        href={`${window.location.origin}/rsvp/${inv.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-600 hover:underline truncate block max-w-xs"
                        title={`${window.location.origin}/rsvp/${inv.token}`}
                      >
                        {t('events.rsvpLink')}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {statusBadge(inv.status)}
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {new Date(inv.sent_at).toLocaleDateString()}
                    </span>
                    {inv.status !== 'cancelled' && (
                      <button
                        onClick={() => copyRsvpLink(inv.token)}
                        className="text-slate-300 hover:text-blue-500 transition-colors"
                        title={t('events.copyLink')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => cancelMutation.mutate(inv.id)}
                        disabled={cancelMutation.isPending}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title={t('invitations.cancelInvite')}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {inv.status === 'cancelled' && (
                      <button
                        onClick={() => resendMutation.mutate(inv.id)}
                        disabled={resendMutation.isPending}
                        className="text-slate-300 hover:text-green-500 transition-colors"
                        title={t('invitations.resendInvite')}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(inv)}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                      title={t('invitations.editGuest')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        </> /* end guests tab */
        )}

      </div>

      {showGuestBookPicker && (
        <GuestBookPickerModal
          contacts={allContacts}
          groups={allGroups}
          existingEmails={new Set([
            ...stagingGuests.map(guest => guest.email),
            ...invitations.map(invitation => invitation.recipient_email),
          ])}
          onAdd={(guests) => setStagingGuests(prev => {
            const existing = new Set([
              ...prev.map(guest => guest.email),
              ...invitations.map(invitation => invitation.recipient_email),
            ]);
            return [...prev, ...guests.filter(guest => !existing.has(guest.email))];
          })}
          onClose={() => setShowGuestBookPicker(false)}
          t={t}
        />
      )}

      {/* ── Edit Guest Dialog ── */}
      {editingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">{t('invitations.editGuestTitle')}</h3>
              <button onClick={() => setEditingInv(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('common.name')}</label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="border-slate-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('common.email')}</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="border-slate-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('invitations.phone')}</label>
                <PhoneInput
                  value={editPhone}
                  onChange={setEditPhone}
                  placeholder={t('invitations.phonePlaceholder')}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingInv(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={editGuestMutation.isPending}
                onClick={() =>
                  editGuestMutation.mutate({
                    invId: editingInv.id,
                    data: { recipient_name: editName, recipient_email: editEmail, recipient_phone: editPhone },
                  })
                }
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

        {/* ── Reminders Card ── */}
        {hasAnyReminder && isUpcoming && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <BellRing className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-900">{t('events.reminders')}</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {reminderDaysBefore > 0
                ? t('events.remindersAutoNote', { count: reminderDaysBefore })
                : t('events.remindersManualNote')}
            </p>
            <div className="flex flex-wrap gap-3">
              {isReminderAccepted && (
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2"
                  disabled={sendReminderMutation.isPending}
                  onClick={() => sendReminderMutation.mutate('accepted')}
                >
                  <BellRing className="h-4 w-4" />
                  {t('events.sendReminderAccepted')}
                </Button>
              )}
              {isReminderPending && (
                <Button
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2"
                  disabled={sendReminderMutation.isPending}
                  onClick={() => sendReminderMutation.mutate('pending')}
                >
                  <BellRing className="h-4 w-4" />
                  {t('events.sendReminderPending')}
                </Button>
              )}
              {isReminderAccepted && isReminderPending && (
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2"
                  disabled={sendReminderMutation.isPending}
                  onClick={() => sendReminderMutation.mutate('both')}
                >
                  <BellRing className="h-4 w-4" />
                  {t('events.sendReminderBoth')}
                </Button>
              )}
            </div>
          </div>
        )}

    </AppLayout>
  );
}


function GuestBookPickerModal({
  contacts,
  groups,
  existingEmails,
  onAdd,
  onClose,
  t,
}: {
  contacts: Contact[];
  groups: ContactGroup[];
  existingEmails: Set<string>;
  onAdd: (guests: { email: string; name: string }[]) => void;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [pickerTab, setPickerTab] = useState<'contacts' | 'groups'>('contacts');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const availableContacts = contacts.filter(contact => !existingEmails.has(contact.email));
  const filteredContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectGroup = (group: ContactGroup) => {
    const toAdd = group.members
      .filter(member => !existingEmails.has(member.email))
      .map(member => ({ email: member.email, name: member.name }));
    if (toAdd.length > 0) onAdd(toAdd);
    onClose();
  };

  const addSelected = () => {
    const toAdd = contacts
      .filter(contact => selected.has(contact.id) && !existingEmails.has(contact.email))
      .map(contact => ({ email: contact.email, name: contact.name }));
    onAdd(toAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">{t('guestBook.addFromGuestBook')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 shrink-0">
          {(['contacts', 'groups'] as const).map(key => (
            <button
              key={key}
              onClick={() => setPickerTab(key)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                pickerTab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t(`guestBook.${key}`)}
            </button>
          ))}
        </div>

        {pickerTab === 'contacts' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder={t('guestBook.searchContacts')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm border-slate-200" />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {filteredContacts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t('guestBook.noContacts')}</p>}
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border',
                    selected.has(contact.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50'
                  )}
                >
                  <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', selected.has(contact.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                    {selected.has(contact.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{contact.name}</p>
                    <p className="text-xs text-slate-400">{contact.email}</p>
                  </div>
                </div>
              ))}
            </div>
            {selected.size > 0 && (
              <Button className="mt-3 w-full bg-blue-600 hover:bg-blue-700 shrink-0" onClick={addSelected}>
                {t('guestBook.addSelected', { count: selected.size })}
              </Button>
            )}
          </div>
        )}

        {pickerTab === 'groups' && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {groups.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t('guestBook.noGroups')}</p>}
            {groups.map(group => {
              const availableMembers = group.members.filter(member => !existingEmails.has(member.email));
              return (
                <div key={group.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                    <p className="text-xs text-slate-400">{t('guestBook.members', { count: group.members.length })}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={availableMembers.length === 0}
                    onClick={() => selectGroup(group)}
                    className="shrink-0"
                  >
                    {t('guestBook.addAll')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
