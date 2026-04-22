import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Calendar, MapPin, Check, X, Search, ArrowUpDown, Send, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Invitation } from '@/types';

type SortField = 'sent_at' | 'event_title' | 'recipient_email' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

function StatusBadge({ status }: { status: string }) {
  if (status === 'accepted')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Accepted</span>;
  if (status === 'rejected')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Declined</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>;
}

export default function InvitationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'sent' | 'received'>('sent');

  // Sent (outgoing) invitations
  const { data: sentData, isLoading: sentLoading } = useQuery({
    queryKey: ['invitations-outgoing'],
    queryFn: () => api.get('/invitations/outgoing').then(r => r.data),
  });

  // Received (incoming) invitations
  const { data: receivedData, isLoading: receivedLoading } = useQuery({
    queryKey: ['invitations-incoming'],
    queryFn: () => api.get('/invitations/incoming').then(r => r.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/invitations/${id}/respond`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations-incoming'] });
      toast.success(t('invitations.respondSuccess'));
    },
    onError: () => toast.error(t('invitations.respondError')),
  });

  // ── Sent tab state ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('sent_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sentInvitations: Invitation[] = sentData?.invitations || [];
  const receivedInvitations: Invitation[] = receivedData?.invitations || [];

  const uniqueEvents = useMemo(() => {
    const map = new Map<string, string>();
    sentInvitations.forEach(inv => {
      if (inv.event_id && inv.event_title) map.set(inv.event_id, inv.event_title);
    });
    return Array.from(map.entries());
  }, [sentInvitations]);

  const filtered = useMemo(() => {
    let list = [...sentInvitations];
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (eventFilter !== 'all') list = list.filter(i => i.event_id === eventFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.recipient_email.toLowerCase().includes(q) ||
        (i.recipient_name || '').toLowerCase().includes(q) ||
        (i.event_title || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = a[sortField] as string ?? '';
      let bv = b[sortField] as string ?? '';
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [sentInvitations, statusFilter, eventFilter, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const stats = useMemo(() => ({
    total: sentInvitations.length,
    accepted: sentInvitations.filter(i => i.status === 'accepted').length,
    pending: sentInvitations.filter(i => i.status === 'pending').length,
    declined: sentInvitations.filter(i => i.status === 'rejected').length,
  }), [sentInvitations]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors"
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortField === field ? 'text-blue-500' : 'text-slate-300')} />
    </button>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Invitations</h1>
          <p className="text-slate-500 mt-1">Manage invitations you've sent and received</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('sent')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'sent' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Send className="h-4 w-4" />
            Sent
            {sentInvitations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-semibold">
                {sentInvitations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('received')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'received' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Mail className="h-4 w-4" />
            Received
            {receivedInvitations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-semibold">
                {receivedInvitations.length}
              </span>
            )}
          </button>
        </div>

        {/* ── SENT TAB ── */}
        {tab === 'sent' && (
          <>
            {/* Stats row */}
            {sentInvitations.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                  { label: 'Accepted', value: stats.accepted, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                  { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                  { label: 'Declined', value: stats.declined, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
                    <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email or event…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 border-slate-200"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Declined</option>
              </select>

              {uniqueEvents.length > 1 && (
                <select
                  value={eventFilter}
                  onChange={e => setEventFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-48 truncate"
                >
                  <option value="all">All events</option>
                  {uniqueEvents.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {sentLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : sentInvitations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 flex flex-col items-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-5">
                  <Send className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No invitations sent yet</h3>
                <p className="text-slate-400 text-sm mb-5">Go to one of your events to invite guests.</p>
                <Link to="/events">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">View My Events</Button>
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 flex flex-col items-center py-12 text-center">
                <Search className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No results match your filters</p>
                <button onClick={() => { setSearch(''); setStatusFilter('all'); setEventFilter('all'); }} className="mt-2 text-sm text-blue-600 hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <SortHeader field="recipient_email" label="Guest" />
                  <SortHeader field="event_title" label="Event" />
                  <SortHeader field="status" label="Status" />
                  <SortHeader field="sent_at" label="Sent" />
                </div>

                <ul className="divide-y divide-slate-100">
                  {filtered.map(inv => (
                    <li key={inv.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors">
                      {/* Guest */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{inv.recipient_email}</p>
                        {inv.recipient_name && (
                          <p className="text-xs text-slate-400 truncate">{inv.recipient_name}</p>
                        )}
                      </div>

                      {/* Event */}
                      <div className="min-w-0">
                        <Link
                          to={`/events/${inv.event_id}`}
                          className="text-sm font-medium text-blue-600 hover:underline truncate block"
                        >
                          {inv.event_title || '—'}
                        </Link>
                        {inv.event_date && (
                          <p className="text-xs text-slate-400">{fmtDate(inv.event_date)}</p>
                        )}
                      </div>

                      {/* Status */}
                      <StatusBadge status={inv.status} />

                      {/* Sent date */}
                      <p className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(inv.sent_at)}</p>
                    </li>
                  ))}
                </ul>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                  Showing {filtered.length} of {sentInvitations.length} invitation{sentInvitations.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RECEIVED TAB ── */}
        {tab === 'received' && (
          <>
            {receivedLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : receivedInvitations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 flex flex-col items-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-5">
                  <Mail className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('invitations.noInvitations')}</h3>
                <p className="text-slate-400 text-sm">{t('invitations.noInvitationsSubtitle')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedInvitations.map((inv: Invitation) => (
                  <div
                    key={inv.id}
                    className={cn(
                      'bg-white rounded-2xl shadow-sm border border-slate-200/70 border-l-4 overflow-hidden hover:shadow-md transition-shadow',
                      inv.status === 'accepted' ? 'border-l-emerald-500' :
                      inv.status === 'rejected' ? 'border-l-red-400' : 'border-l-blue-500'
                    )}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-slate-900">{inv.event_title}</h3>
                            <StatusBadge status={inv.status} />
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-blue-400" />
                              {inv.event_date ? fmtDate(inv.event_date) : '—'}
                            </div>
                            {inv.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-rose-400" />
                                {inv.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-slate-400" />
                              {t('invitations.invitedBy')} {inv.sender_name}
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
                              <Check className="h-4 w-4 mr-1" />{t('invitations.accept')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                              onClick={() => respondMutation.mutate({ id: inv.id, status: 'rejected' })}
                              disabled={respondMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />{t('invitations.decline')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </AppLayout>
  );
}
