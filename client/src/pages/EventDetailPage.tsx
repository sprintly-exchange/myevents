import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Send, Copy, Edit, ArrowLeft, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Invitation } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const isPaid = user?.payment_status === 'paid' || user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const event = data?.event;
  const invitations: Invitation[] = data?.invitations || [];

  const sendInvitations = async () => {
    const emails = emailInput.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { toast.error('Enter at least one email'); return; }
    setSending(true);
    try {
      const res = await api.post('/invitations', { event_id: id, emails, template_id: event?.template_id });
      toast.success(t('events.invitationsSent', { count: res.data.count }));
      setEmailInput('');
      qc.invalidateQueries({ queryKey: ['event', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const copyRsvpLink = (token: string) => {
    const url = `${window.location.origin}/rsvp/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(t('events.linkCopied'));
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success">{t('invitations.accepted')}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">{t('invitations.declined')}</Badge>;
    return <Badge variant="warning">{t('common.pending')}</Badge>;
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

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </button>

        {/* Hero section */}
        <div className={`rounded-2xl overflow-hidden mb-6 ${isUpcoming ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-gradient-to-r from-slate-600 to-slate-700'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <Badge className="mb-3 bg-white/20 text-white border-0 hover:bg-white/30">
                  {isUpcoming ? t('common.upcoming') : t('common.past')}
                </Badge>
                <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
                {event.description && (
                  <p className="text-white/80 text-sm leading-relaxed">{event.description}</p>
                )}
              </div>
              <Link to={`/events/${id}/edit`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Info cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Date & Time</p>
              <p className="font-semibold text-sm text-slate-800">{new Date(event.event_date).toLocaleString('sv-SE')}</p>
            </div>
          </div>

          {event.location ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <MapPin className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{t('events.location')}</p>
                <p className="font-semibold text-sm text-slate-800">{event.location}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 flex items-center gap-4 opacity-50">
              <div className="p-2.5 rounded-xl bg-slate-100">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{t('events.location')}</p>
                <p className="text-sm text-slate-400">Not specified</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-violet-50">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('events.guests')}</p>
              <p className="font-semibold text-sm text-slate-800">{invitations.length} invited</p>
            </div>
          </div>
        </div>

        {/* Send invitations */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">{t('events.sendInvitations')}</h2>
          <p className="text-sm text-slate-500 mb-4">{t('events.sendInvitationsSubtitle')}</p>

          {!isPaid ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm mb-1">{t('events.paymentRequiredTitle')}</p>
                <p className="text-sm text-amber-700 mb-3">{t('events.paymentRequiredDesc')}</p>
                <Link to="/upgrade">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                    {t('events.completePayment')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="emails" className="sr-only">Emails</Label>
                  <Input
                    id="emails"
                    placeholder={t('events.emailsPlaceholder')}
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="border-slate-200 focus:border-blue-400"
                  />
                </div>
                <Button onClick={sendInvitations} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? t('events.sending') : t('events.send')}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">{t('events.separateByCommas')}</p>
            </>
          )}
        </div>

        {/* Guest list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
          <div className="p-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{t('events.guestList')} ({invitations.length})</h2>
          </div>
          <div className="p-6 pt-4">
            {invitations.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">{t('events.noGuestsYet')}</h3>
                <p className="text-sm text-slate-400">Use the form above to send your first invitations</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-slate-600">{t('common.email')}</TableHead>
                    <TableHead className="text-slate-600">{t('common.name')}</TableHead>
                    <TableHead className="text-slate-600">Status</TableHead>
                    <TableHead className="text-slate-600">Sent</TableHead>
                    <TableHead className="text-slate-600">RSVP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-slate-50 border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-700">{inv.recipient_email}</TableCell>
                      <TableCell className="text-slate-600">{inv.recipient_name || '—'}</TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell className="text-sm text-slate-400">{new Date(inv.sent_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => copyRsvpLink(inv.token)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
